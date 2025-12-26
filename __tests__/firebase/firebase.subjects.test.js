/**
 * Firebase Security Rules Tests - Subjects Collection
 *
 * Tests subjects collection access control
 * This tests the actual firestore.rules file against the Firebase emulator
 *
 * Run with: firebase emulators:exec --only firestore "npm test -- __tests__/firebase.subjects.test.js"
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
        projectId: 'test-project-subjects',
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

describe('Firebase Security Rules - Subjects Collection', () => {
    const teacherEmail = 'teacher@kings.edu.au';
    const tutorEmail = 'tutor@kings.edu.au';
    const studentEmail = 'student@student.kings.edu.au';

    describe('Subjects - Read Access', () => {
        test('authenticated users CAN read subjects', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: 'student',
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('subjects').get());
        });

        test('unauthenticated users CANNOT read subjects', async () => {
            const context = testEnv.unauthenticatedContext();
            const db = context.firestore();

            await assertFails(db.collection('subjects').get());
        });
    });

    describe('Subjects - Create Access', () => {
        test('teacher CAN create subjects', async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                role: 'teacher',
            });
            const db = context.firestore();

            const subjectData = {
                name: 'Mathematics',
                code: 'MATH101',
                description: 'Advanced Mathematics',
                createdAt: new Date(),
            };

            await assertSucceeds(db.collection('subjects').add(subjectData));
        });

        test('tutor CANNOT create subjects', async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                role: 'tutor',
            });
            const db = context.firestore();

            const subjectData = {
                name: 'Mathematics',
                code: 'MATH101',
            };

            await assertFails(db.collection('subjects').add(subjectData));
        });

        test('student CANNOT create subjects', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: 'student',
            });
            const db = context.firestore();

            const subjectData = {
                name: 'Mathematics',
                code: 'MATH101',
            };

            await assertFails(db.collection('subjects').add(subjectData));
        });
    });

    describe('Subjects - Update Access', () => {
        let subjectId;

        beforeEach(async () => {
            // Create a subject for testing
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const db = context.firestore();
                const ref = await db.collection('subjects').add({
                    name: 'Mathematics',
                    code: 'MATH101',
                    description: 'Basic Mathematics',
                });
                subjectId = ref.id;
            });
        });

        test('teacher CAN update subjects', async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                role: 'teacher',
            });
            const db = context.firestore();

            await assertSucceeds(
                db.collection('subjects').doc(subjectId).update({
                    name: 'Advanced Mathematics',
                    description: 'Updated description',
                }),
            );
        });

        test('tutor CANNOT update subjects', async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                role: 'tutor',
            });
            const db = context.firestore();

            await assertFails(
                db.collection('subjects').doc(subjectId).update({
                    name: 'Hacked Mathematics',
                }),
            );
        });

        test('student CANNOT update subjects', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: 'student',
            });
            const db = context.firestore();

            await assertFails(
                db.collection('subjects').doc(subjectId).update({
                    name: 'Hacked Mathematics',
                }),
            );
        });
    });

    describe('Subjects - Delete Access', () => {
        let subjectId;

        beforeEach(async () => {
            // Create a subject for testing
            await testEnv.withSecurityRulesDisabled(async (context) => {
                const db = context.firestore();
                const ref = await db.collection('subjects').add({
                    name: 'Mathematics',
                    code: 'MATH101',
                });
                subjectId = ref.id;
            });
        });

        test('teacher CAN delete subjects', async () => {
            const context = testEnv.authenticatedContext(teacherEmail, {
                email: teacherEmail,
                role: 'teacher',
            });
            const db = context.firestore();

            await assertSucceeds(db.collection('subjects').doc(subjectId).delete());
        });

        test('tutor CANNOT delete subjects', async () => {
            const context = testEnv.authenticatedContext(tutorEmail, {
                email: tutorEmail,
                role: 'tutor',
            });
            const db = context.firestore();

            await assertFails(db.collection('subjects').doc(subjectId).delete());
        });

        test('student CANNOT delete subjects', async () => {
            const context = testEnv.authenticatedContext(studentEmail, {
                email: studentEmail,
                role: 'student',
            });
            const db = context.firestore();

            await assertFails(db.collection('subjects').doc(subjectId).delete());
        });
    });
});
