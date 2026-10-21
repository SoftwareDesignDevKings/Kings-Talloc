import 'server-only';
import { adminDb } from '@/firestore/firestoreAdmin';
import { emailOf } from '@/lib/scheduling/eventRules';
import { canvasCache } from './canvasCache';

const EMPTY_ELIGIBILITY = { coverageKeys: [], eligibleTutorEmails: [], eligibleTutors: [] };

/**
 * Whitelisted courses with their student rosters, as the Classes page and staff
 * event forms show them. Staff share one cached copy instead of every browser tab
 * reading both collections; grades and activity data are left out.
 */
export const readClassDirectory = () => canvasCache('canvas:classes', async () => {
    const [coursesSnapshot, enrollmentsSnapshot] = await Promise.all([
        adminDb.collection('canvasCourses').get(),
        adminDb.collection('canvasEnrollments').select('courseId', 'userId', 'userName', 'sortableName', 'email', 'emailLower').get(),
    ]);
    const studentsByCourse = new Map();
    enrollmentsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const courseId = String(data.courseId || '');
        if (!courseId) return;
        const students = studentsByCourse.get(courseId) || [];
        students.push({
            id: data.userId,
            canvasUserId: data.userId,
            enrollmentId: doc.id,
            email: data.email || data.emailLower || '',
            name: data.userName || data.email || data.emailLower || '',
            sortableName: data.sortableName || '',
        });
        studentsByCourse.set(courseId, students);
    });
    return coursesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name || '',
            courseCode: data.courseCode || '',
            workflowState: data.workflowState || '',
            termId: data.termId ?? null,
            termName: data.termName || '',
            termStartAt: data.termStartAt || null,
            termEndAt: data.termEndAt || null,
            syncedAt: data.syncedAt || null,
            rosterSyncedAt: data.rosterSyncedAt || null,
            blueprintCourseId: data.blueprintCourseId || null,
            blueprintCourseName: data.blueprintCourseName || null,
            blueprintCourseCode: data.blueprintCourseCode || null,
            students: studentsByCourse.get(doc.id) || [],
        };
    });
});

/** Every Canvas student's email and name, for bounded directory searches. */
export const readStudentDirectory = () => canvasCache('canvas:directory', async () => {
    const snapshot = await adminDb.collection('canvasUsers').select('email', 'name').get();
    return [...new Map(snapshot.docs.map(doc => {
        const data = doc.data();
        const email = emailOf(data.email);
        return [email, { email, name: data.name || email }];
    }).filter(([email]) => email.includes('@'))).values()].sort((a, b) => a.name.localeCompare(b.name));
});

/** One student's tutor eligibility, read on every availability refresh. */
export const readStudentEligibility = email => {
    const id = emailOf(email);
    if (!id.includes('@') || id.includes('/')) return Promise.resolve(EMPTY_ELIGIBILITY);
    return canvasCache(`canvas:eligibility:${id}`, async () => {
        const data = (await adminDb.collection('studentTutorEligibility').doc(id).get()).data();
        return data ? {
            coverageKeys: data.coverageKeys || [],
            eligibleTutorEmails: data.eligibleTutorEmails || [],
            eligibleTutors: data.eligibleTutors || [],
        } : EMPTY_ELIGIBILITY;
    });
};
