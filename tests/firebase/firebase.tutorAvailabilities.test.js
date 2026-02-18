/**
 * Firebase Security Rules Tests - Tutor Availabilities Collection
 *
 * Tests tutorAvailabilities collection access control:
 * - Any authenticated user can read
 * - Tutors and coaches can create/update/delete their own (tutor field = their email)
 * - Teachers, students, and other tutors/coaches cannot write
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
        projectId: 'test-project-tutor-availabilities',
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

describe('Firebase Security Rules - Tutor Availabilities Collection', () => {
    const teacherEmail = 'teacher@kings.edu.au';
    const tutorEmail = 'tutor@kings.edu.au';
    const otherTutorEmail = 'othertutor@kings.edu.au';
    const coachEmail = 'coach@kings.edu.au';
    const studentEmail = 'student@student.kings.edu.au';

    describe('Tutor Availabilities - Read Access', () => {
        test('authenticated users CAN read tutor availabilities', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('tutorAvailabilities').get());
        });

        test('unauthenticated users CANNOT read tutor availabilities', async () => {
            const context = testEnv.unauthenticatedContext();
            const db = context.firestore();

            await assertFails(db.collection('tutorAvailabilities').get());
        });
    });

    describe('Tutor Availabilities - Create Access', () => {
        test('tutor CAN create their own availability', async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                defaultRole: 'tutor',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection('tutorAvailabilities').add({
                    tutor: tutorEmail,
                    start: new Date('2025-10-15T09:00:00'),
                    end: new Date('2025-10-15T10:00:00'),
                    recurring: false,
                }),
            );
        });

        test('coach CAN create their own availability', async () => {
            const context = testEnv.authenticatedContext(coachEmail, {
                email: coachEmail,
                defaultRole: 'coach',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection('tutorAvailabilities').add({
                    tutor: coachEmail,
                    start: new Date('2025-10-15T09:00:00'),
                    end: new Date('2025-10-15T10:00:00'),
                    recurring: false,
                }),
            );
        });

        test('tutor CANNOT create availability for another tutor', async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                defaultRole: 'tutor',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('tutorAvailabilities').add({
                    tutor: otherTutorEmail,
                    start: new Date('2025-10-15T09:00:00'),
                    end: new Date('2025-10-15T10:00:00'),
                    recurring: false,
                }),
            );
        });

        test('teacher CANNOT create tutor availabilities', async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                defaultRole: 'teacher',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('tutorAvailabilities').add({
                    tutor: tutorEmail,
                    start: new Date('2025-10-15T09:00:00'),
                    end: new Date('2025-10-15T10:00:00'),
                    recurring: false,
                }),
            );
        });

        test('student CANNOT create tutor availabilities', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('tutorAvailabilities').add({
                    tutor: tutorEmail,
                    start: new Date('2025-10-15T09:00:00'),
                    end: new Date('2025-10-15T10:00:00'),
                    recurring: false,
                }),
            );
        });
    });

    describe('Tutor Availabilities - Update Access', () => {
        let tutorAvailabilityId;
        let coachAvailabilityId;

        beforeEach(async () => {
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const db = context.firestore();

                const ref1 = await db.collection('tutorAvailabilities').add({
                    tutor: tutorEmail,
                    start: new Date('2025-10-15T09:00:00'),
                    end: new Date('2025-10-15T10:00:00'),
                    recurring: false,
                });
                tutorAvailabilityId = ref1.id;

                const ref2 = await db.collection('tutorAvailabilities').add({
                    tutor: coachEmail,
                    start: new Date('2025-10-15T11:00:00'),
                    end: new Date('2025-10-15T12:00:00'),
                    recurring: false,
                });
                coachAvailabilityId = ref2.id;
            });
        });

        test('tutor CAN update their own availability', async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                defaultRole: 'tutor',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection('tutorAvailabilities').doc(tutorAvailabilityId).update({
                    start: new Date('2025-10-15T10:00:00'),
                    end: new Date('2025-10-15T11:00:00'),
                }),
            );
        });

        test('coach CAN update their own availability', async () => {
            const context = testEnv.authenticatedContext(coachEmail, {
                email: coachEmail,
                defaultRole: 'coach',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection('tutorAvailabilities').doc(coachAvailabilityId).update({
                    start: new Date('2025-10-15T12:00:00'),
                    end: new Date('2025-10-15T13:00:00'),
                }),
            );
        });

        test("tutor CANNOT update another tutor's availability", async () => {
            const context = testEnv.authenticatedContext(otherTutorEmail, {
                email: otherTutorEmail,
                defaultRole: 'tutor',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('tutorAvailabilities').doc(tutorAvailabilityId).update({
                    start: new Date('2025-10-15T10:00:00'),
                }),
            );
        });

        test('teacher CANNOT update tutor availabilities', async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                defaultRole: 'teacher',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('tutorAvailabilities').doc(tutorAvailabilityId).update({
                    start: new Date('2025-10-15T10:00:00'),
                }),
            );
        });

        test('student CANNOT update tutor availabilities', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('tutorAvailabilities').doc(tutorAvailabilityId).update({
                    start: new Date('2025-10-15T10:00:00'),
                }),
            );
        });
    });

    describe('Tutor Availabilities - Delete Access', () => {
        let tutorAvailabilityId;
        let coachAvailabilityId;

        beforeEach(async () => {
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const db = context.firestore();

                const ref1 = await db.collection('tutorAvailabilities').add({
                    tutor: tutorEmail,
                    start: new Date('2025-10-15T09:00:00'),
                    end: new Date('2025-10-15T10:00:00'),
                    recurring: false,
                });
                tutorAvailabilityId = ref1.id;

                const ref2 = await db.collection('tutorAvailabilities').add({
                    tutor: coachEmail,
                    start: new Date('2025-10-15T11:00:00'),
                    end: new Date('2025-10-15T12:00:00'),
                    recurring: false,
                });
                coachAvailabilityId = ref2.id;
            });
        });

        test('tutor CAN delete their own availability', async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                defaultRole: 'tutor',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection('tutorAvailabilities').doc(tutorAvailabilityId).delete(),
            );
        });

        test('coach CAN delete their own availability', async () => {
            const context = testEnv.authenticatedContext(coachEmail, {
                email: coachEmail,
                defaultRole: 'coach',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection('tutorAvailabilities').doc(coachAvailabilityId).delete(),
            );
        });

        test("tutor CANNOT delete another tutor's availability", async () => {
            const context = testEnv.authenticatedContext(otherTutorEmail, {
                email: otherTutorEmail,
                defaultRole: 'tutor',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('tutorAvailabilities').doc(tutorAvailabilityId).delete(),
            );
        });

        test('teacher CANNOT delete tutor availabilities', async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                defaultRole: 'teacher',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('tutorAvailabilities').doc(tutorAvailabilityId).delete(),
            );
        });

        test('student CANNOT delete tutor availabilities', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('tutorAvailabilities').doc(tutorAvailabilityId).delete(),
            );
        });
    });
});
