/**
 * Firebase Security Rules Tests - Student Event Requests Collection
 *
 * Tests studentEventRequests collection access control:
 * - Admins/teachers can read all requests
 * - Students can only read requests they're in (emailsList)
 * - Tutors/coaches cannot read any requests
 * - Students and admins/teachers can create; tutors/coaches cannot
 * - Students can update/delete their own; admins/teachers can update/delete all
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
    const adminEmail = 'admin@kings.edu.au';
    const teacherEmail = 'teacher@kings.edu.au';
    const tutorEmail = 'tutor@kings.edu.au';
    const studentEmail = 'student@student.kings.edu.au';
    const otherStudentEmail = 'otherstudent@student.kings.edu.au';

    describe('Student Event Requests - Read Access', () => {
        let ownRequestId;
        let otherRequestId;

        beforeEach(async () => {
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const db = context.firestore();

                // Request that studentEmail is in
                const ref1 = await db.collection('studentEventRequests').add({
                    title: 'Help with Math',
                    emailsList: [studentEmail],
                    start: new Date('2025-10-15T09:00:00'),
                    end: new Date('2025-10-15T10:00:00'),
                    approvalStatus: 'pending',
                });
                ownRequestId = ref1.id;

                // Request that studentEmail is NOT in
                const ref2 = await db.collection('studentEventRequests').add({
                    title: 'Help with Physics',
                    emailsList: [otherStudentEmail],
                    start: new Date('2025-10-15T11:00:00'),
                    end: new Date('2025-10-15T12:00:00'),
                    approvalStatus: 'pending',
                });
                otherRequestId = ref2.id;
            });
        });

        test('teacher CAN read any request', async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                defaultRole: 'teacher',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('studentEventRequests').doc(otherRequestId).get());
        });

        test('admin CAN read any request', async () => {
            const context = testEnv.authenticatedContext(adminEmail, {
                email: adminEmail,
                defaultRole: 'admin',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('studentEventRequests').doc(otherRequestId).get());
        });

        test('student CAN read a request they are in', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('studentEventRequests').doc(ownRequestId).get());
        });

        test('student CANNOT read a request they are NOT in', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(db.collection('studentEventRequests').doc(otherRequestId).get());
        });

        test('tutor CANNOT read any student request', async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                defaultRole: 'tutor',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(db.collection('studentEventRequests').doc(ownRequestId).get());
        });

        test('unauthenticated users CANNOT read student event requests', async () => {
            const context = testEnv.unauthenticatedContext();
            const db = context.firestore();

            await assertFails(db.collection('studentEventRequests').doc(ownRequestId).get());
        });
    });

    describe('Student Event Requests - Create Access', () => {
        const requestData = {
            title: 'Help with Math',
            start: new Date('2025-10-15T09:00:00'),
            end: new Date('2025-10-15T10:00:00'),
            emailsList: [studentEmail],
            studentEmails: [studentEmail],
            students: [{ value: studentEmail, label: 'Student Name' }],
            classes: [],
            subject: 'Mathematics',
            approvalStatus: 'pending',
        };

        test('student CAN create their own event request', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('studentEventRequests').add(requestData));
        });

        test('teacher CAN create student event requests', async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                defaultRole: 'teacher',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('studentEventRequests').add(requestData));
        });

        test('admin CAN create student event requests', async () => {
            const context = testEnv.authenticatedContext(adminEmail, {
                email: adminEmail,
                defaultRole: 'admin',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('studentEventRequests').add(requestData));
        });

        test('tutor CANNOT create student event requests', async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                defaultRole: 'tutor',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(db.collection('studentEventRequests').add(requestData));
        });

        test('student CANNOT create a request with a class assignment', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(db.collection('studentEventRequests').add({
                ...requestData,
                classes: [{ value: '123', label: 'Mathematics Year 10' }],
            }));
        });

        test('student CANNOT create a request for another student', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(db.collection('studentEventRequests').add({
                ...requestData,
                emailsList: [otherStudentEmail],
                studentEmails: [otherStudentEmail],
                students: [{ value: otherStudentEmail, label: 'Other Student' }],
            }));
        });
    });

    describe('Student Event Requests - Update Access', () => {
        let requestId;

        beforeEach(async () => {
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const db = context.firestore();
                const ref = await db.collection('studentEventRequests').add({
                    title: 'Help with Math',
                    start: new Date('2025-10-15T09:00:00'),
                    end: new Date('2025-10-15T10:00:00'),
                    emailsList: [studentEmail],
                    studentEmails: [studentEmail],
                    students: [{ value: studentEmail, label: 'Student Name' }],
                    classes: [],
                    subject: 'Mathematics',
                    approvalStatus: 'pending',
                });
                requestId = ref.id;
            });
        });

        test('teacher CAN update any student event request', async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                defaultRole: 'teacher',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection('studentEventRequests').doc(requestId).update({
                    approvalStatus: 'approved',
                }),
            );
        });

        test('admin CAN update any student event request', async () => {
            const context = testEnv.authenticatedContext(adminEmail, {
                email: adminEmail,
                defaultRole: 'admin',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection('studentEventRequests').doc(requestId).update({
                    approvalStatus: 'approved',
                }),
            );
        });

        test('student CAN update their own event request', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection('studentEventRequests').doc(requestId).update({
                    subject: 'Physics',
                }),
            );
        });

        test("student CANNOT update another student's event request", async () => {
            const context = testEnv.authenticatedContext(otherStudentEmail, {
                email: otherStudentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('studentEventRequests').doc(requestId).update({
                    subject: 'Hacked',
                }),
            );
        });

        test('tutor CANNOT update student event requests', async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                defaultRole: 'tutor',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('studentEventRequests').doc(requestId).update({
                    approvalStatus: 'approved',
                }),
            );
        });

        test('student CANNOT update their own request to add a class', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('studentEventRequests').doc(requestId).update({
                    classes: [{ value: '123', label: 'Mathematics Year 10' }],
                }),
            );
        });
    });

    describe('Student Event Requests - Delete Access', () => {
        let requestId;

        beforeEach(async () => {
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const db = context.firestore();
                const ref = await db.collection('studentEventRequests').add({
                    title: 'Help with Math',
                    start: new Date('2025-10-15T09:00:00'),
                    end: new Date('2025-10-15T10:00:00'),
                    emailsList: [studentEmail],
                    studentEmails: [studentEmail],
                    classes: [],
                    approvalStatus: 'pending',
                });
                requestId = ref.id;
            });
        });

        test('teacher CAN delete any student event request', async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                defaultRole: 'teacher',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('studentEventRequests').doc(requestId).delete());
        });

        test('admin CAN delete any student event request', async () => {
            const context = testEnv.authenticatedContext(adminEmail, {
                email: adminEmail,
                defaultRole: 'admin',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('studentEventRequests').doc(requestId).delete());
        });

        test('student CAN delete their own event request', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('studentEventRequests').doc(requestId).delete());
        });

        test("student CANNOT delete another student's event request", async () => {
            const context = testEnv.authenticatedContext(otherStudentEmail, {
                email: otherStudentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(db.collection('studentEventRequests').doc(requestId).delete());
        });

        test('tutor CANNOT delete student event requests', async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                defaultRole: 'tutor',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(db.collection('studentEventRequests').doc(requestId).delete());
        });
    });
});
