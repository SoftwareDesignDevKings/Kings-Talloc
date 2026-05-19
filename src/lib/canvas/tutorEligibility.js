import 'server-only';

import { adminDb } from '@/firestore/firestoreAdmin';
import { getCanvasCoverageKey, hasTutorAccess } from './canvasCoverage';

const BATCH_LIMIT = 400;

const chunkedCommit = async (writes) => {
    for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
        const batch = adminDb.batch();
        writes.slice(i, i + BATCH_LIMIT).forEach((write) => {
            if (write.type === 'delete') {
                batch.delete(write.ref);
            } else {
                batch.set(write.ref, write.data, { merge: true });
            }
        });
        await batch.commit();
    }
};

const normalizeEmail = (email) =>
    typeof email === 'string' ? email.trim().toLowerCase() : '';

const hasCoverageOverlap = (studentCoverageKeys, tutorCoverageKeys) =>
    tutorCoverageKeys.some((key) => studentCoverageKeys.has(key));

export const buildStudentTutorEligibility = ({ courses = [], enrollments = [], users = [] }) => {
    const coverageKeyByCourseId = new Map();
    courses.forEach((course) => {
        const courseId = String(course.id || '');
        const coverageKey = getCanvasCoverageKey(course);
        if (courseId && coverageKey) coverageKeyByCourseId.set(courseId, coverageKey);
    });

    const coverageKeysByStudentEmail = new Map();
    enrollments.forEach((enrollment) => {
        const email = normalizeEmail(enrollment.emailLower || enrollment.email);
        const courseId = String(enrollment.courseId || '');
        const coverageKey = coverageKeyByCourseId.get(courseId);
        if (!email || !coverageKey) return;

        const coverageKeys = coverageKeysByStudentEmail.get(email) || new Set();
        coverageKeys.add(coverageKey);
        coverageKeysByStudentEmail.set(email, coverageKeys);
    });

    const tutorCoverage = users
        .filter(hasTutorAccess)
        .map((user) => ({
            email: normalizeEmail(user.email),
            coverageKeys: (user.tutorCoverageKeys || []).filter(Boolean),
        }))
        .filter((tutor) => tutor.email && tutor.coverageKeys.length > 0);

    return [...coverageKeysByStudentEmail.entries()].map(([studentEmail, coverageKeys]) => {
        const eligibleTutorEmails = tutorCoverage
            .filter((tutor) => hasCoverageOverlap(coverageKeys, tutor.coverageKeys))
            .map((tutor) => tutor.email)
            .sort();

        return {
            studentEmail,
            coverageKeys: [...coverageKeys].sort(),
            eligibleTutorEmails,
        };
    });
};

export const rebuildStudentTutorEligibility = async ({ updatedAt = new Date() } = {}) => {
    const [coursesSnapshot, enrollmentsSnapshot, usersSnapshot, existingSnapshot] = await Promise.all([
        adminDb.collection('canvasCourses').get(),
        adminDb.collection('canvasEnrollments').get(),
        adminDb.collection('users').get(),
        adminDb.collection('studentTutorEligibility').get(),
    ]);

    const eligibilityDocs = buildStudentTutorEligibility({
        courses: coursesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        enrollments: enrollmentsSnapshot.docs.map((doc) => doc.data()),
        users: usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    });

    const currentStudentEmails = new Set(eligibilityDocs.map((doc) => doc.studentEmail));
    const writes = eligibilityDocs.map((doc) => ({
        type: 'set',
        ref: adminDb.collection('studentTutorEligibility').doc(doc.studentEmail),
        data: {
            ...doc,
            updatedAt,
        },
    }));

    existingSnapshot.docs.forEach((doc) => {
        if (!currentStudentEmails.has(doc.id)) {
            writes.push({ type: 'delete', ref: doc.ref });
        }
    });

    await chunkedCommit(writes);

    return {
        studentCount: eligibilityDocs.length,
        writeCount: writes.length,
    };
};
