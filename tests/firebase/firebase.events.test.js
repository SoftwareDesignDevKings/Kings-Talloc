/**
 * Firebase Security Rules Tests - Events Collection
 *
 * Tests shifts collection access control:
 * - Admins/teachers can read all shifts
 * - Tutors/coaches/students can only read shifts they're assigned to (emailsList)
 * - Only admins/teachers can create/delete
 * - Tutors/coaches can update workStatus only; admins/teachers can update anything
 *
 * @jest-environment node
 */

const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');

const { assertFails, assertSucceeds } = global;
const fs = require('fs');
const path = require('path');

let testEnv;

beforeAll(async () => {
    const rulesPath = path.join(__dirname, '../../firebase', 'firestore.rules');
    const rules = fs.readFileSync(rulesPath, 'utf8');

    testEnv = await initializeTestEnvironment({
        projectId: 'test-project-events',
        firestore: {
            rules,
            host: 'localhost',
            port: 8080,
        },
    });
});

afterAll(async () => {
    await testEnv.cleanup();
});

beforeEach(async () => {
    await testEnv.clearFirestore();
});

describe('Firebase Security Rules - Events Collection', () => {
    const adminEmail = 'admin@kings.edu.au';
    const teacherEmail = 'teacher@kings.edu.au';
    const tutorEmail = 'tutor@kings.edu.au';
    const coachEmail = 'coach@kings.edu.au';
    const studentEmail = 'student@student.kings.edu.au';

    describe('Events - Read Access', () => {
        let assignedShiftId;
        let unassignedShiftId;

        beforeEach(async () => {
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const db = context.firestore();

                // Shift that tutor and student are assigned to
                const ref1 = await db.collection('shifts').add({
                    title: 'Assigned Shift',
                    emailsList: [tutorEmail, coachEmail, studentEmail],
                    start: new Date('2025-10-15T09:00:00'),
                    end: new Date('2025-10-15T10:00:00'),
                    workStatus: 'notCompleted',
                    workType: 'tutoring',
                });
                assignedShiftId = ref1.id;

                // Shift that the tutor/student are NOT assigned to
                const ref2 = await db.collection('shifts').add({
                    title: 'Other Shift',
                    emailsList: ['other@kings.edu.au'],
                    start: new Date('2025-10-15T11:00:00'),
                    end: new Date('2025-10-15T12:00:00'),
                    workStatus: 'notCompleted',
                    workType: 'tutoring',
                });
                unassignedShiftId = ref2.id;
            });
        });

        test('teacher CAN read any shift', async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                defaultRole: 'teacher',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('shifts').doc(unassignedShiftId).get());
        });

        test('admin CAN read any shift', async () => {
            const context = testEnv.authenticatedContext(adminEmail, {
                email: adminEmail,
                defaultRole: 'admin',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('shifts').doc(unassignedShiftId).get());
        });

        test('tutor CAN read a shift they are assigned to', async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                defaultRole: 'tutor',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('shifts').doc(assignedShiftId).get());
        });

        test('tutor CANNOT read a shift they are NOT assigned to', async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                defaultRole: 'tutor',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(db.collection('shifts').doc(unassignedShiftId).get());
        });

        test('coach CAN read a shift they are assigned to', async () => {
            const context = testEnv.authenticatedContext(coachEmail, {
                email: coachEmail,
                defaultRole: 'coach',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('shifts').doc(assignedShiftId).get());
        });

        test('coach CANNOT read a shift they are NOT assigned to', async () => {
            const context = testEnv.authenticatedContext(coachEmail, {
                email: coachEmail,
                defaultRole: 'coach',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(db.collection('shifts').doc(unassignedShiftId).get());
        });

        test('student CAN read a shift they are assigned to', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('shifts').doc(assignedShiftId).get());
        });

        test('student CANNOT read a shift they are NOT assigned to', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(db.collection('shifts').doc(unassignedShiftId).get());
        });

        test('unauthenticated users CANNOT read shifts', async () => {
            const context = testEnv.unauthenticatedContext();
            const db = context.firestore();

            await assertFails(db.collection('shifts').doc(assignedShiftId).get());
        });
    });

    describe('Events - Create Access', () => {
        const eventData = {
            title: 'Test Event',
            start: new Date('2025-10-15T09:00:00'),
            end: new Date('2025-10-15T10:00:00'),
            emailsList: [tutorEmail],
            staff: [{ value: tutorEmail, label: 'Tutor' }],
            students: [],
            workStatus: 'notCompleted',
            workType: 'tutoring',
        };

        test('teacher CAN create shifts', async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                defaultRole: 'teacher',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('shifts').add(eventData));
        });

        test('admin CAN create shifts', async () => {
            const context = testEnv.authenticatedContext(adminEmail, {
                email: adminEmail,
                defaultRole: 'admin',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('shifts').add(eventData));
        });

        test('tutor CANNOT create shifts', async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                defaultRole: 'tutor',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(db.collection('shifts').add(eventData));
        });

        test('coach CANNOT create shifts', async () => {
            const context = testEnv.authenticatedContext(coachEmail, {
                email: coachEmail,
                defaultRole: 'coach',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(db.collection('shifts').add(eventData));
        });

        test('student CANNOT create shifts', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(db.collection('shifts').add(eventData));
        });
    });

    describe('Events - Update Access', () => {
        let eventId;

        beforeEach(async () => {
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const db = context.firestore();
                const ref = await db.collection('shifts').add({
                    title: 'Test Event',
                    start: new Date('2025-10-15T09:00:00'),
                    end: new Date('2025-10-15T10:00:00'),
                    emailsList: [tutorEmail, coachEmail],
                    staff: [{ value: tutorEmail, label: 'Tutor' }],
                    students: [],
                    workStatus: 'notCompleted',
                    workType: 'tutoring',
                    description: 'Test description',
                });
                eventId = ref.id;
            });
        });

        test('teacher CAN update any field', async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                defaultRole: 'teacher',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection('shifts').doc(eventId).update({
                    title: 'Updated Title',
                    description: 'Updated description',
                    workStatus: 'completed',
                }),
            );
        });

        test('admin CAN update any field', async () => {
            const context = testEnv.authenticatedContext(adminEmail, {
                email: adminEmail,
                defaultRole: 'admin',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection('shifts').doc(eventId).update({
                    title: 'Updated Title',
                    workStatus: 'completed',
                }),
            );
        });

        test('tutor CAN update only workStatus', async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                defaultRole: 'tutor',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection('shifts').doc(eventId).update({ workStatus: 'completed' }),
            );
        });

        test('coach CAN update only workStatus', async () => {
            const context = testEnv.authenticatedContext(coachEmail, {
                email: coachEmail,
                defaultRole: 'coach',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection('shifts').doc(eventId).update({ workStatus: 'completed' }),
            );
        });

        test('tutor CANNOT update workStatus AND other fields', async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                defaultRole: 'tutor',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('shifts').doc(eventId).update({
                    workStatus: 'completed',
                    title: 'Hacked title',
                }),
            );
        });

        test('tutor CANNOT update title field', async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                defaultRole: 'tutor',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('shifts').doc(eventId).update({ title: 'Updated Title' }),
            );
        });

        test('coach CANNOT update title field', async () => {
            const context = testEnv.authenticatedContext(coachEmail, {
                email: coachEmail,
                defaultRole: 'coach',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('shifts').doc(eventId).update({ title: 'Updated Title' }),
            );
        });

        test('student CANNOT update shifts', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('shifts').doc(eventId).update({ workStatus: 'completed' }),
            );
        });
    });

    describe('Events - Delete Access', () => {
        let eventId;

        beforeEach(async () => {
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const db = context.firestore();
                const ref = await db.collection('shifts').add({
                    title: 'Test Event',
                    start: new Date('2025-10-15T09:00:00'),
                    end: new Date('2025-10-15T10:00:00'),
                    emailsList: [tutorEmail],
                    workStatus: 'notCompleted',
                });
                eventId = ref.id;
            });
        });

        test('teacher CAN delete shifts', async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                defaultRole: 'teacher',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('shifts').doc(eventId).delete());
        });

        test('admin CAN delete shifts', async () => {
            const context = testEnv.authenticatedContext(adminEmail, {
                email: adminEmail,
                defaultRole: 'admin',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('shifts').doc(eventId).delete());
        });

        test('tutor CANNOT delete shifts', async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                defaultRole: 'tutor',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(db.collection('shifts').doc(eventId).delete());
        });

        test('coach CANNOT delete shifts', async () => {
            const context = testEnv.authenticatedContext(coachEmail, {
                email: coachEmail,
                defaultRole: 'coach',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(db.collection('shifts').doc(eventId).delete());
        });

        test('student CANNOT delete shifts', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(db.collection('shifts').doc(eventId).delete());
        });
    });
});
