/**
 * Firebase Security Rules Tests - Users Collection
 *
 * Tests users collection access control:
 * - Any authenticated user can read
 * - Admin/teacher or self can create
 * - Only admin can update or delete
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
        projectId: 'test-project-users',
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

describe('Firebase Security Rules - Users Collection', () => {
    const adminEmail = 'admin@kings.edu.au';
    const teacherEmail = 'teacher@kings.edu.au';
    const tutorEmail = 'tutor@kings.edu.au';
    const studentEmail = 'student@student.kings.edu.au';
    const otherStudentEmail = 'otherstudent@student.kings.edu.au';

    describe('Users - Read Access', () => {
        test('authenticated users CAN read users', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('users').get());
        });

        test('unauthenticated users CANNOT read users', async () => {
            const context = testEnv.unauthenticatedContext();
            const db = context.firestore();

            await assertFails(db.collection('users').get());
        });
    });

    describe('Users - Create Access', () => {
        test('user CAN create their own user document', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection('users').doc(studentEmail).set({
                    email: studentEmail,
                    name: 'Test Student',
                    defaultRole: 'student',
                    userRoles: [],
                }),
            );
        });

        test('teacher CAN create user documents', async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                defaultRole: 'teacher',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection('users').doc(studentEmail).set({
                    email: studentEmail,
                    name: 'New Student',
                    defaultRole: 'student',
                    userRoles: [],
                }),
            );
        });

        test('admin CAN create user documents', async () => {
            const context = testEnv.authenticatedContext(adminEmail, {
                email: adminEmail,
                defaultRole: 'admin',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection('users').doc(studentEmail).set({
                    email: studentEmail,
                    name: 'New Student',
                    defaultRole: 'student',
                    userRoles: [],
                }),
            );
        });

        test('user CANNOT create a document for another user', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('users').doc(otherStudentEmail).set({
                    email: otherStudentEmail,
                    name: 'Other Student',
                    defaultRole: 'student',
                    userRoles: [],
                }),
            );
        });

        test('unauthenticated users CANNOT create user documents', async () => {
            const context = testEnv.unauthenticatedContext();
            const db = context.firestore();

            await assertFails(
                db.collection('users').doc(studentEmail).set({
                    email: studentEmail,
                    name: 'Test Student',
                }),
            );
        });
    });

    describe('Users - Update Access', () => {
        beforeEach(async () => {
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const db = context.firestore();
                await db.collection('users').doc(studentEmail).set({
                    email: studentEmail,
                    name: 'Test Student',
                    defaultRole: 'student',
                    userRoles: [],
                });
                await db.collection('users').doc(tutorEmail).set({
                    email: tutorEmail,
                    name: 'Test Tutor',
                    defaultRole: 'tutor',
                    userRoles: [],
                });
            });
        });

        test('admin CAN update any user', async () => {
            const context = testEnv.authenticatedContext(adminEmail, {
                email: adminEmail,
                defaultRole: 'admin',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection('users').doc(studentEmail).update({ name: 'Updated Name' }),
            );
        });

        test('admin CAN update user roles', async () => {
            const context = testEnv.authenticatedContext(adminEmail, {
                email: adminEmail,
                defaultRole: 'admin',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection('users').doc(studentEmail).update({ defaultRole: 'tutor' }),
            );
        });

        test('teacher CANNOT update users', async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                defaultRole: 'teacher',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('users').doc(studentEmail).update({ name: 'Updated Name' }),
            );
        });

        test('tutor CANNOT update any user', async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                defaultRole: 'tutor',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('users').doc(studentEmail).update({ defaultRole: 'teacher' }),
            );
        });

        test('student CANNOT update their own document', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('users').doc(studentEmail).update({ name: 'Updated Name' }),
            );
        });

        test("student CANNOT update another user's document", async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('users').doc(tutorEmail).update({ name: 'Hacked Name' }),
            );
        });
    });

    describe('Users - Delete Access', () => {
        beforeEach(async () => {
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const db = context.firestore();
                await db.collection('users').doc(studentEmail).set({
                    email: studentEmail,
                    name: 'Test Student',
                    defaultRole: 'student',
                    userRoles: [],
                });
            });
        });

        test('admin CAN delete users', async () => {
            const context = testEnv.authenticatedContext(adminEmail, {
                email: adminEmail,
                defaultRole: 'admin',
                userRoles: [],
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('users').doc(studentEmail).delete());
        });

        test('teacher CANNOT delete users', async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                defaultRole: 'teacher',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(db.collection('users').doc(studentEmail).delete());
        });

        test('tutor CANNOT delete users', async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                defaultRole: 'tutor',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(db.collection('users').doc(studentEmail).delete());
        });

        test('student CANNOT delete their own user document', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(db.collection('users').doc(studentEmail).delete());
        });
    });
});
