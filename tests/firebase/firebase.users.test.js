/**
 * Firebase Security Rules Tests - Users Collection
 *
 * Tests users collection access control:
 * - Any authenticated user can read
 * - Admin/teacher or self can create
 * - Students can acknowledge their own introductions; other updates require admin
 * - Only admin can delete
 *
 * @jest-environment node
 */

const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const { seedRuleAccounts } = require('./seedRuleAccounts');
const { deleteField } = require('firebase/firestore');

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
            port: Number((process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':').at(-1)),
        },
    });
});

afterAll(async () => {
    await testEnv.cleanup();
});

beforeEach(async () => {
    await testEnv.clearFirestore();
    await seedRuleAccounts(testEnv);
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
        test('user CANNOT create their own user document', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('users').doc(studentEmail).set({
                    email: studentEmail,
                    name: 'Test Student',
                    defaultRole: 'student',
                    userRoles: [],
                }),
            );
        });

        test('teacher CANNOT create user documents directly', async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                defaultRole: 'teacher',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('users').doc(studentEmail).set({
                    email: studentEmail,
                    name: 'New Student',
                    defaultRole: 'student',
                    userRoles: [],
                }),
            );
        });

        test('admin CANNOT bypass the account API to create user documents', async () => {
            const context = testEnv.authenticatedContext(adminEmail, {
                email: adminEmail,
                defaultRole: 'admin',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
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

        test('admin CANNOT directly update any user', async () => {
            const context = testEnv.authenticatedContext(adminEmail, {
                email: adminEmail,
                defaultRole: 'admin',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
                db.collection('users').doc(studentEmail).update({ name: 'Updated Name' }),
            );
        });

        test('admin CANNOT directly update user roles', async () => {
            const context = testEnv.authenticatedContext(adminEmail, {
                email: adminEmail,
                defaultRole: 'admin',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(
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

        test('student CANNOT update unrelated fields on their own document', async () => {
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

        describe('Student introduction acknowledgements', () => {
            const studentContext = () => testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                defaultRole: 'student',
                userRoles: [],
            });
            let studentRef;

            beforeEach(() => {
                studentRef = studentContext().firestore().collection('users').doc(studentEmail);
            });

            test.each(['hasSeenWelcome', 'hasSeenCalendarHelp'])(
                'student CAN save %s on a legacy account and read it on a later visit',
                async (field) => {
                    await assertSucceeds(studentRef.update({ [field]: true }));

                    const laterVisitRef = studentContext().firestore().collection('users').doc(studentEmail);
                    const savedUser = await assertSucceeds(laterVisitRef.get());
                    expect(savedUser.data()).toMatchObject({
                        [field]: true,
                        name: 'Test Student',
                        defaultRole: 'student',
                        userRoles: [],
                    });
                },
            );

            test.each([
                ['hasSeenWelcome', 'hasSeenCalendarHelp'],
                ['hasSeenCalendarHelp', 'hasSeenWelcome'],
            ])('student CAN acknowledge %s while %s is still false', async (first, second) => {
                await testEnv.withSecurityRulesDisabled(async (context) => {
                    await context.firestore().collection('users').doc(studentEmail).update({
                        hasSeenWelcome: false,
                        hasSeenCalendarHelp: false,
                    });
                });

                await assertSucceeds(studentRef.update({ [first]: true }));
                expect((await studentRef.get()).data()[second]).toBe(false);
                await assertSucceeds(studentRef.update({ [second]: true }));
                expect((await studentRef.get()).data()).toMatchObject({
                    hasSeenWelcome: true,
                    hasSeenCalendarHelp: true,
                });
            });

            test('student CAN acknowledge both introductions together', async () => {
                await assertSucceeds(studentRef.update({
                    hasSeenWelcome: true,
                    hasSeenCalendarHelp: true,
                }));
            });

            test('student role in userRoles CAN acknowledge introductions', async () => {
                await testEnv.withSecurityRulesDisabled(context => context.firestore().collection('users').doc(studentEmail).update({ defaultRole: 'tutor', userRoles: ['student'] }));
                const context = testEnv.authenticatedContext(studentEmail, {
                    email: studentEmail,
                    defaultRole: 'tutor',
                    userRoles: ['student'],
                });

                await assertSucceeds(context.firestore().collection('users').doc(studentEmail).update({
                    hasSeenWelcome: true,
                }));
            });

            test.each(['hasSeenWelcome', 'hasSeenCalendarHelp'])(
                'student CANNOT reset, mistype or delete %s',
                async (field) => {
                    await testEnv.withSecurityRulesDisabled(async (context) => {
                        await context.firestore().collection('users').doc(studentEmail).update({ [field]: true });
                    });

                    for (const value of [false, 'true', 1, null, deleteField()]) {
                        await assertFails(studentRef.update({ [field]: value }));
                    }
                    expect((await studentRef.get()).data()[field]).toBe(true);
                },
            );

            test.each([
                ['name', 'Changed Name'],
                ['defaultRole', 'admin'],
                ['userRoles', ['admin']],
                ['requestNotificationsEnabled', true],
            ])('student CANNOT change %s alongside an acknowledgement', async (field, value) => {
                await assertFails(studentRef.update({
                    hasSeenWelcome: true,
                    [field]: value,
                }));
            });

            test('student CANNOT replace their profile with acknowledgement fields', async () => {
                await assertFails(studentRef.set({ hasSeenWelcome: true }));
            });

            test("student CANNOT acknowledge another user's introductions", async () => {
                await assertFails(studentContext().firestore().collection('users').doc(tutorEmail).update({
                    hasSeenWelcome: true,
                    hasSeenCalendarHelp: true,
                }));
            });

            test('non-student CANNOT use the acknowledgement exception on their own profile', async () => {
                const context = testEnv.authenticatedContext(tutorEmail, {
                    email: tutorEmail,
                    defaultRole: 'tutor',
                    userRoles: [],
                });

                await assertFails(context.firestore().collection('users').doc(tutorEmail).update({
                    hasSeenWelcome: true,
                }));
            });

            test('unauthenticated user CANNOT acknowledge introductions', async () => {
                await assertFails(testEnv.unauthenticatedContext().firestore().collection('users').doc(studentEmail).update({
                    hasSeenWelcome: true,
                }));
            });
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

        test('admin CANNOT bypass account revocation by directly deleting users', async () => {
            const context = testEnv.authenticatedContext(adminEmail, {
                email: adminEmail,
                defaultRole: 'admin',
                userRoles: [],
            });
            const db = context.firestore();

            await assertFails(db.collection('users').doc(studentEmail).delete());
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
