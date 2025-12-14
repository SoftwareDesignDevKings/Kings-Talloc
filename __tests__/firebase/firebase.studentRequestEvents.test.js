/**
 * Firebase Security Rules Tests - Student Event Requests Collection
 *
 * Tests studentEventRequests collection access control
 * This tests the actual firestore.rules file against the Firebase emulator
 *
 * Run with: firebase emulators:exec --only firestore "npm test -- __tests__/firebase.studentRequestEvents.test.js"
 *
 * @jest-environment node
 */

const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');

// assertFails and assertSucceeds are provided by firebaseTestSetup.js
// to properly suppress console warnings only during expected failures
const { assertFails, assertSucceeds } = global;
const fs = require('fs');
const path = require('path');

let testEnv;

beforeAll(async () => {
    // Read the actual firestore.rules file
    const rulesPath = path.join(__dirname, '../../firebase', 'firestore.rules');
    const rules = fs.readFileSync(rulesPath, 'utf8');

    // Initialize test environment with the actual rules
    testEnv = await initializeTestEnvironment({
        projectId: 'test-project-student-requests',
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

describe('Firebase Security Rules - Student Event Requests Collection', () => {
    const teacherEmail = 'teacher@kings.edu.au';
    const tutorEmail = 'tutor@kings.edu.au';
    const studentEmail = 'student@student.kings.edu.au';
    const otherStudentEmail = 'otherstudent@student.kings.edu.au';

    describe('Student Event Requests - Read Access', () => {
        test('authenticated users CAN read student event requests', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: 'student',
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('studentEventRequests').get());
        });

        test('unauthenticated users CANNOT read student event requests', async () => {
            const context = testEnv.unauthenticatedContext();
            const db = context.firestore();

            await assertFails(db.collection('studentEventRequests').get());
        });
    });

    describe('Student Event Requests - Create Access', () => {
        test('student CAN create their own event request', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: 'student',
            });
            const db = context.firestore();

            const requestData = {
                title: 'Help with Math',
                start: new Date('2025-10-15T09:00:00'),
                end: new Date('2025-10-15T10:00:00'),
                students: [{ value: studentEmail, label: 'Student Name' }],
                subject: 'Mathematics',
                description: 'Need help with calculus',
                status: 'pending',
            };

            await assertSucceeds(db.collection('studentEventRequests').add(requestData));
        });

        test('teacher CANNOT create student event requests', async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                role: 'teacher',
            });
            const db = context.firestore();

            const requestData = {
                title: 'Help with Math',
                start: new Date('2025-10-15T09:00:00'),
                end: new Date('2025-10-15T10:00:00'),
                students: [{ value: studentEmail, label: 'Student' }],
            };

            await assertFails(db.collection('studentEventRequests').add(requestData));
        });

        test('tutor CANNOT create student event requests', async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                role: 'tutor',
            });
            const db = context.firestore();

            const requestData = {
                title: 'Help with Math',
                start: new Date('2025-10-15T09:00:00'),
                end: new Date('2025-10-15T10:00:00'),
                students: [{ value: studentEmail, label: 'Student' }],
            };

            await assertFails(db.collection('studentEventRequests').add(requestData));
        });
    });

    describe('Student Event Requests - Update Access', () => {
        let requestId;

        beforeEach(async () => {
            // Create a student request for testing
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const db = context.firestore();
                const ref = await db.collection('studentEventRequests').add({
                    title: 'Help with Math',
                    start: new Date('2025-10-15T09:00:00'),
                    end: new Date('2025-10-15T10:00:00'),
                    students: [{ value: studentEmail, label: 'Student Name' }],
                    subject: 'Mathematics',
                    status: 'pending',
                });
                requestId = ref.id;
            });
        });

        test('teacher CAN update any student event request', async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                role: 'teacher',
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection('studentEventRequests').doc(requestId).update({
                    status: 'approved',
                    assignedTutor: tutorEmail,
                }),
            );
        });

        test('student CAN update their own event request', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: 'student',
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection('studentEventRequests').doc(requestId).update({
                    description: 'Updated description',
                    subject: 'Physics',
                }),
            );
        });

        test("student CANNOT update another student's event request", async () => {
            const context = testEnv.authenticatedContext(otherStudentEmail, {
                email: otherStudentEmail,
                role: 'student',
            });
            const db = context.firestore();

            await assertFails(
                db.collection('studentEventRequests').doc(requestId).update({
                    description: 'Hacked description',
                }),
            );
        });

        test('tutor CANNOT update student event requests', async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                role: 'tutor',
            });
            const db = context.firestore();

            await assertFails(
                db.collection('studentEventRequests').doc(requestId).update({
                    status: 'approved',
                }),
            );
        });
    });

    describe('Student Event Requests - Delete Access', () => {
        let requestId;

        beforeEach(async () => {
            // Create a student request for testing
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const db = context.firestore();
                const ref = await db.collection('studentEventRequests').add({
                    title: 'Help with Math',
                    start: new Date('2025-10-15T09:00:00'),
                    end: new Date('2025-10-15T10:00:00'),
                    students: [{ value: studentEmail, label: 'Student Name' }],
                    status: 'pending',
                });
                requestId = ref.id;
            });
        });

        test('teacher CAN delete any student event request', async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                role: 'teacher',
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('studentEventRequests').doc(requestId).delete());
        });

        test('student CAN delete their own event request', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: 'student',
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('studentEventRequests').doc(requestId).delete());
        });

        test("student CANNOT delete another student's event request", async () => {
            const context = testEnv.authenticatedContext(otherStudentEmail, {
                email: otherStudentEmail,
                role: 'student',
            });
            const db = context.firestore();

            await assertFails(db.collection('studentEventRequests').doc(requestId).delete());
        });

        test('tutor CANNOT delete student event requests', async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                role: 'tutor',
            });
            const db = context.firestore();

            await assertFails(db.collection('studentEventRequests').doc(requestId).delete());
        });
    });
});
