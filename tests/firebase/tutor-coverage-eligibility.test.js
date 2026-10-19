/** @jest-environment node */
// Run the real eligibility service against a dedicated demo namespace, never the app's database.
jest.mock('server-only', () => ({}), { virtual: true });
jest.mock('@/firestore/firestoreAdmin', () => {
    const host = process.env.FIRESTORE_EMULATOR_HOST;
    if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host || '')) throw new Error('Coverage eligibility checks require an explicit loopback Firestore emulator.');
    const { Firestore } = require('firebase-admin/firestore');
    return { adminDb: new Firestore({ projectId: `demo-coverage-check-${process.pid}`, host, ssl: false }) };
});
const { readFileSync } = require('node:fs');
const { adminDb } = require('@/firestore/firestoreAdmin');
const { rebuildStudentTutorEligibility } = require('@/lib/canvas/tutorEligibility');
const { buildEligibleTutorOptions } = require('@/lib/canvas/canvasCoverage');
const saved = process.env.COVERAGE_SAVED_USER ? JSON.parse(readFileSync(process.env.COVERAGE_SAVED_USER, 'utf8')) : {
    email: 'ui-coverage-migrate@example.edu', name: 'Coverage Migration Check', defaultRole: 'tutor', userRoles: [],
    tutorCoverageKeys: ['blueprint:ui-coverage-blueprint', 'course:ui-coverage-robotics'],
};
const students = ['bp-a@example.edu', 'bp-b@example.edu', 'robotics@example.edu', 'unrelated@example.edu'];
const courseIds = ['ui-coverage-linked-a', 'ui-coverage-linked-b', 'ui-coverage-robotics', 'ui-coverage-unrelated'];
const readEligibility = async () => Promise.all(students.map(async email => (await adminDb.collection('studentTutorEligibility').doc(email).get()).data()));
const writeUser = async patch => adminDb.collection('users').doc(saved.email).set({ ...saved, ...patch });
jest.setTimeout(60000);
beforeEach(async () => {
    const batch = adminDb.batch();
    for (const [index, id] of courseIds.entries()) {
        batch.set(adminDb.collection('canvasCourses').doc(id), { id, ...(index < 2 ? { blueprintCourseId: 'ui-coverage-blueprint', blueprintCourseCode: 'BP_12SEN' } : {}) });
        batch.set(adminDb.collection('canvasEnrollments').doc(String(index)), { courseId: id, emailLower: students[index] });
    }
    batch.set(adminDb.collection('users').doc(saved.email), saved);
    batch.set(adminDb.collection('studentTutorEligibility').doc('stale@example.edu'), { eligibleTutorEmails: [saved.email] });
    await batch.commit();
});
afterAll(async () => {
    const snapshots = await Promise.all(['users', 'canvasCourses', 'canvasEnrollments', 'studentTutorEligibility'].map(collection => adminDb.collection(collection).get()));
    const batch = adminDb.batch(); snapshots.flatMap(snapshot => snapshot.docs).forEach(doc => batch.delete(doc.ref)); await batch.commit();
    await adminDb.terminate();
});
test('UI-saved blueprint and course coverage produce exact eligibility, subject labels and stale-record cleanup', async () => {
    const result = await rebuildStudentTutorEligibility({ updatedAt: new Date('2032-05-03T00:00:00Z') });
    expect(result).toEqual({ studentCount: 4, writeCount: 5 });
    const rows = await readEligibility();
    expect(rows.map(row => row.eligibleTutorEmails)).toEqual([[saved.email], [saved.email], [saved.email], []]);
    expect(rows[0].eligibleTutors).toEqual([{ email: saved.email, subjectCodes: ['SEN'] }]);
    expect(rows[2].eligibleTutors).toEqual([{ email: saved.email, subjectCodes: [] }]);
    const tutors = [{ email: saved.email, name: saved.name }, { email: 'excluded@example.edu', name: 'Excluded' }];
    expect(buildEligibleTutorOptions(tutors, rows[0])).toEqual([{ value: saved.email, label: `${saved.name} (SEN)` }]);
    expect(buildEligibleTutorOptions(tutors, rows[3])).toEqual([]);
    expect((await adminDb.collection('studentTutorEligibility').doc('stale@example.edu').get()).exists).toBe(false);
});
test('removing blueprint coverage removes eligibility from both linked classes while keeping course fallback', async () => {
    await writeUser({ tutorCoverageKeys: saved.tutorCoverageKeys.filter(key => !key.startsWith('blueprint:')) });
    await rebuildStudentTutorEligibility();
    expect((await readEligibility()).map(row => row.eligibleTutorEmails)).toEqual([[], [], [saved.email], []]);
});
test('a coach with additional tutor access remains eligible; removing tutor access removes eligibility', async () => {
    await writeUser({ defaultRole: 'coach', role: 'coach', userRoles: ['tutor'] }); await rebuildStudentTutorEligibility();
    expect((await readEligibility())[0].eligibleTutorEmails).toEqual([saved.email]);
    await writeUser({ defaultRole: 'coach', role: 'coach', userRoles: [] }); await rebuildStudentTutorEligibility();
    expect((await readEligibility()).map(row => row.eligibleTutorEmails)).toEqual([[], [], [], []]);
});
test('clearing saved coverage leaves no eligible tutors', async () => {
    await writeUser({ tutorCoverage: [], tutorCoverageKeys: [] }); await rebuildStudentTutorEligibility();
    expect((await readEligibility()).map(row => row.eligibleTutorEmails)).toEqual([[], [], [], []]);
});
