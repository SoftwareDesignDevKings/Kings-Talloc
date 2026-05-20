import 'server-only';

import { adminDb } from '@/firestore/firestoreAdmin';

const serializeTimestamp = (value) => {
    if (!value) return null;
    if (value.toDate) return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    return value;
};

const sortByName = (a, b) => (a.name || '').localeCompare(b.name || '');

const mapCanvasCourse = (docSnap) => {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        name: data.name || '',
        courseCode: data.courseCode || '',
        workflowState: data.workflowState || '',
        termId: data.termId ?? null,
        termName: data.termName || '',
        termStartAt: data.termStartAt || null,
        termEndAt: data.termEndAt || null,
        syncedAt: serializeTimestamp(data.syncedAt),
        rosterSyncedAt: serializeTimestamp(data.rosterSyncedAt),
        blueprintCourseId: data.blueprintCourseId || null,
        blueprintCourseName: data.blueprintCourseName || null,
        blueprintCourseCode: data.blueprintCourseCode || null,
    };
};

const mapCanvasStudent = (docSnap) => {
    const { email, name, sortableName, sisId } = docSnap.data();
    return {
        id: docSnap.id,
        canvasUserId: docSnap.id,
        email,
        name: name || email,
        sortableName,
        sisId,
    };
};

export const listCanvasCourses = async () => {
    const snapshot = await adminDb.collection('canvasCourses').get();
    return snapshot.docs.map(mapCanvasCourse).sort(sortByName);
};

export const listCanvasClasses = async () => {
    const [coursesSnapshot, enrollmentsSnapshot] = await Promise.all([
        adminDb.collection('canvasCourses').get(),
        adminDb.collection('canvasEnrollments').get(),
    ]);

    const studentsByCourse = new Map();
    enrollmentsSnapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const courseId = String(data.courseId || '');
        if (!courseId) return;

        const students = studentsByCourse.get(courseId) || [];
        students.push({
            id: data.userId,
            canvasUserId: data.userId,
            enrollmentId: docSnap.id,
            email: data.email || data.emailLower || '',
            name: data.userName || data.email || data.emailLower || '',
            sortableName: data.sortableName || '',
            enrollmentState: data.enrollmentState || '',
            lastActivityAt: serializeTimestamp(data.lastActivityAt),
            currentScore: data.currentScore ?? null,
            currentGrade: data.currentGrade || null,
            finalScore: data.finalScore ?? null,
            finalGrade: data.finalGrade || null,
        });
        studentsByCourse.set(courseId, students);
    });

    return coursesSnapshot.docs
        .map((docSnap) => ({
            ...mapCanvasCourse(docSnap),
            students: studentsByCourse.get(docSnap.id) || [],
        }))
        .sort(sortByName);
};

export const listCanvasStudents = async () => {
    const snapshot = await adminDb.collection('canvasUsers').get();
    return snapshot.docs.map(mapCanvasStudent).sort(sortByName);
};
