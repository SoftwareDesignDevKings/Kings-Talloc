import 'server-only';

import { adminDb } from '@/firestore/firestoreAdmin';
import { createCanvasClient } from './canvasClient';
import {
    mapBlueprintSubscription,
    mapCanvasCourse,
    mapCanvasEnrollment,
    mapCanvasUserFromEnrollment,
} from './canvasMappers';
import { getStaleEnrollmentIdsForDeletion } from './canvasSyncPlanning';

const SYNC_STATE_REF = adminDb.collection('canvasSyncState').doc('main');
const BATCH_LIMIT = 400;

class CanvasSyncAlreadyRunningError extends Error {
    constructor() {
        super('A Canvas sync is already in progress.');
        this.name = 'CanvasSyncAlreadyRunningError';
        this.code = 'already_running';
    }
}

export { CanvasSyncAlreadyRunningError };

const now = () => new Date();

const chunkedCommit = async (writes) => {
    for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
        const batch = adminDb.batch();
        for (const write of writes.slice(i, i + BATCH_LIMIT)) {
            if (write.type === 'set') {
                batch.set(write.ref, write.data, { merge: true });
            } else if (write.type === 'delete') {
                batch.delete(write.ref);
            }
        }
        await batch.commit();
    }
};

const setProgress = async (progress) => {
    await SYNC_STATE_REF.set({
        isRunning: true,
        progress,
        updatedAt: now(),
    }, { merge: true });
};

const finishSyncState = async ({ status, errorMessage = null, completedAt = now() }) => {
    await SYNC_STATE_REF.set({
        isRunning: false,
        progress: null,
        lastStatus: status,
        lastError: errorMessage,
        lastCompletedAt: completedAt,
        ...(status === 'success' && { lastFullSyncAt: completedAt }),
        updatedAt: completedAt,
    }, { merge: true });
};

const acquireSyncLock = async () => {
    await adminDb.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(SYNC_STATE_REF);
        if (snapshot.exists && snapshot.data()?.isRunning) {
            throw new CanvasSyncAlreadyRunningError();
        }
        transaction.set(SYNC_STATE_REF, {
            isRunning: true,
            progress: {
                syncType: 'full',
                phase: 'Starting Canvas sync',
                currentStep: 'initialising',
            },
            updatedAt: now(),
        }, { merge: true });
    });
};

const archiveLegacyCollection = async (sourceCollection, targetCollection) => {
    const snapshot = await adminDb.collection(sourceCollection).get();
    if (snapshot.empty) return 0;

    const archivedAt = now();
    const writes = snapshot.docs.map((doc) => ({
        type: 'set',
        ref: adminDb.collection(targetCollection).doc(doc.id),
        data: {
            ...doc.data(),
            originalCollection: sourceCollection,
            archivedAt,
        },
    }));
    await chunkedCommit(writes);
    return writes.length;
};

export const archiveLegacyClassesAndSubjects = async () => {
    const [classesArchived, subjectsArchived] = await Promise.all([
        archiveLegacyCollection('classes', 'legacyClasses'),
        archiveLegacyCollection('subjects', 'legacySubjects'),
    ]);
    return { classesArchived, subjectsArchived };
};

const upsertCourse = async ({ course, blueprint, syncedAt }) => {
    const mappedCourse = mapCanvasCourse(course, syncedAt, blueprint);
    await adminDb.collection('canvasCourses').doc(mappedCourse.id).set(mappedCourse, { merge: true });
    return mappedCourse;
};

const syncCourseEnrollments = async ({ client, courseId, syncedAt }) => {
    const enrollments = await client.listStudentEnrollments(courseId);
    const seenEnrollmentIds = new Set();
    const writes = [];

    for (const enrollment of enrollments) {
        if (!enrollment?.id || !enrollment?.user?.id) continue;

        const user = mapCanvasUserFromEnrollment(enrollment, syncedAt);
        const mappedEnrollment = mapCanvasEnrollment(enrollment, courseId, syncedAt);
        seenEnrollmentIds.add(mappedEnrollment.id);

        writes.push({
            type: 'set',
            ref: adminDb.collection('canvasUsers').doc(user.id),
            data: user,
        });
        writes.push({
            type: 'set',
            ref: adminDb.collection('canvasEnrollments').doc(mappedEnrollment.id),
            data: mappedEnrollment,
        });
    }

    const existingEnrollments = await adminDb
        .collection('canvasEnrollments')
        .where('courseId', '==', String(courseId))
        .get();
    const staleEnrollmentIds = getStaleEnrollmentIdsForDeletion({
        existingEnrollmentIds: existingEnrollments.docs.map((doc) => doc.id),
        seenEnrollmentIds: [...seenEnrollmentIds],
        syncType: 'full',
    });
    const staleEnrollmentSet = new Set(staleEnrollmentIds);
    for (const doc of existingEnrollments.docs) {
        if (staleEnrollmentSet.has(doc.id)) {
            writes.push({ type: 'delete', ref: doc.ref });
        }
    }

    await chunkedCommit(writes);
    await adminDb.collection('canvasCourses').doc(String(courseId)).set({
        syncedAt,
        rosterSyncedAt: syncedAt,
        syncedStudentCount: seenEnrollmentIds.size,
    }, { merge: true });

    return seenEnrollmentIds.size;
};

export const runFullCanvasSync = async ({ client = createCanvasClient() } = {}) => {
    const startedAt = now();
    const logRef = adminDb.collection('canvasSyncLog').doc();
    await acquireSyncLock();

    await logRef.set({
        entityType: 'full',
        status: 'running',
        recordsSynced: 0,
        startedAt,
    });

    try {
        await setProgress({
            syncType: 'full',
            phase: 'Archiving legacy class and subject data',
            currentStep: 'archive_legacy',
        });
        const archiveCounts = await archiveLegacyClassesAndSubjects();

        await setProgress({
            syncType: 'full',
            phase: 'Fetching all Canvas courses',
            currentStep: 'courses',
        });
        const canvasCourses = await client.listCourses();
        const whitelistSnapshot = await adminDb.collection('canvasCourseWhitelist').get();
        const whitelistedIds = new Set(whitelistSnapshot.docs.map((doc) => String(doc.id)));
        const coursesToSync = canvasCourses.filter((c) => whitelistedIds.has(String(c.id)));
        const availableCourses = [];
        let recordsSynced = 0;

        for (const course of coursesToSync) {
            const subscriptions = await client.listBlueprintSubscriptions(course.id);
            const blueprint = mapBlueprintSubscription(subscriptions);
            const mappedCourse = await upsertCourse({ course, blueprint, syncedAt: now() });
            recordsSynced += 1;
            if (mappedCourse.workflowState === 'available') {
                availableCourses.push(mappedCourse);
            }
        }

        for (let index = 0; index < availableCourses.length; index += 1) {
            const course = availableCourses[index];
            await setProgress({
                syncType: 'full',
                phase: `Syncing course ${course.id}`,
                currentCourseId: course.id,
                currentStep: 'enrollments',
                totalCourses: availableCourses.length,
                completedCourses: index,
                pendingCourseIds: availableCourses.slice(index).map((item) => item.id),
                completedCourseIds: availableCourses.slice(0, index).map((item) => item.id),
            });
            recordsSynced += await syncCourseEnrollments({
                client,
                courseId: course.id,
                syncedAt: now(),
            });
        }

        const completedAt = now();
        await logRef.set({
            status: 'success',
            recordsSynced,
            completedAt,
            archiveCounts,
        }, { merge: true });
        await finishSyncState({ status: 'success', completedAt });
        return { status: 'success', recordsSynced, archiveCounts };
    } catch (error) {
        const completedAt = now();
        await logRef.set({
            status: 'failed',
            completedAt,
            errorMessage: error.message,
        }, { merge: true });
        await finishSyncState({
            status: 'failed',
            errorMessage: error.message,
            completedAt,
        });
        throw error;
    }
};

export const getCanvasSyncStatus = async () => {
    const [stateDoc, logsSnapshot] = await Promise.all([
        SYNC_STATE_REF.get(),
        adminDb.collection('canvasSyncLog').orderBy('startedAt', 'desc').limit(20).get(),
    ]);

    return {
        is_running: Boolean(stateDoc.data()?.isRunning),
        progress: stateDoc.data()?.progress || null,
        last_status: stateDoc.data()?.lastStatus || null,
        last_error: stateDoc.data()?.lastError || null,
        last_full_sync_at: stateDoc.data()?.lastFullSyncAt || null,
        logs: logsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    };
};
