/**
 * Firebase Security Rules Tests - Canvas cache collections
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
        projectId: 'test-project-canvas',
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

describe('Firebase Security Rules - Canvas cache collections', () => {
    const teacherEmail = 'teacher@kings.edu.au';
    const tutorEmail = 'tutor@kings.edu.au';
    const studentEmail = 'student@student.kings.edu.au';

    const seedCanvasCache = async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await db.collection('canvasCourses').doc('123').set({ name: 'Maths' });
            await db.collection('canvasUsers').doc('987').set({ email: studentEmail });
            await db.collection('canvasEnrollments').doc('555').set({ courseId: '123', userId: '987' });
        });
    };

    test('teachers can read Canvas cache collections', async () => {
        await seedCanvasCache();

        const context = testEnv.authenticatedContext(teacherEmail, {
            email: teacherEmail,
            defaultRole: 'teacher',
            userRoles: [],
        });
        const db = context.firestore();

        await assertSucceeds(db.collection('canvasCourses').get());
        await assertSucceeds(db.collection('canvasUsers').get());
        await assertSucceeds(db.collection('canvasEnrollments').get());
    });

    test('students cannot read Canvas cache collections', async () => {
        await seedCanvasCache();

        const context = testEnv.authenticatedContext(studentEmail, {
            email: studentEmail,
            defaultRole: 'student',
            userRoles: [],
        });
        const db = context.firestore();

        await assertFails(db.collection('canvasCourses').get());
        await assertFails(db.collection('canvasUsers').get());
        await assertFails(db.collection('canvasEnrollments').get());
    });

    test('tutors cannot read Canvas cache collections', async () => {
        await seedCanvasCache();

        const context = testEnv.authenticatedContext(tutorEmail, {
            email: tutorEmail,
            defaultRole: 'tutor',
            userRoles: [],
        });
        const db = context.firestore();

        await assertFails(db.collection('canvasCourses').get());
        await assertFails(db.collection('canvasUsers').get());
        await assertFails(db.collection('canvasEnrollments').get());
    });

    test('unauthenticated users cannot read Canvas cache collections', async () => {
        const context = testEnv.unauthenticatedContext();
        const db = context.firestore();

        await assertFails(db.collection('canvasCourses').get());
        await assertFails(db.collection('canvasUsers').get());
        await assertFails(db.collection('canvasEnrollments').get());
    });

    test('admins can manage Canvas course whitelist', async () => {
        const context = testEnv.authenticatedContext('admin@kings.edu.au', {
            email: 'admin@kings.edu.au',
            defaultRole: 'admin',
            userRoles: [],
        });
        const db = context.firestore();

        await assertSucceeds(db.collection('canvasCourseWhitelist').doc('123').set({
            courseId: '123',
            name: 'Mathematics Year 10',
        }));
        await assertSucceeds(db.collection('canvasCourseWhitelist').doc('123').delete());
    });

    test('teachers cannot manage Canvas course whitelist', async () => {
        const context = testEnv.authenticatedContext(teacherEmail, {
            email: teacherEmail,
            defaultRole: 'teacher',
            userRoles: [],
        });
        const db = context.firestore();

        await assertFails(db.collection('canvasCourseWhitelist').doc('123').set({
            courseId: '123',
            name: 'Mathematics Year 10',
        }));
    });

    test('tutors cannot manage Canvas course whitelist', async () => {
        const context = testEnv.authenticatedContext(tutorEmail, {
            email: tutorEmail,
            defaultRole: 'tutor',
            userRoles: [],
        });
        const db = context.firestore();

        await assertFails(db.collection('canvasCourseWhitelist').doc('123').set({
            courseId: '123',
            name: 'Mathematics Year 10',
        }));
    });

    test('Canvas cache writes are blocked for client SDK users', async () => {
        const context = testEnv.authenticatedContext(teacherEmail, {
            email: teacherEmail,
            defaultRole: 'teacher',
            userRoles: [],
        });
        const db = context.firestore();

        await assertFails(db.collection('canvasCourses').doc('123').set({ name: 'Maths' }));
        await assertFails(db.collection('canvasUsers').doc('987').set({ email: studentEmail }));
        await assertFails(db.collection('canvasEnrollments').doc('555').set({ courseId: '123' }));
    });

    test('only admins can read Canvas sync state and logs', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await db.collection('canvasSyncState').doc('main').set({ isRunning: false });
            await db.collection('canvasSyncLog').doc('log-1').set({ status: 'success' });
        });

        const adminContext = testEnv.authenticatedContext('admin@kings.edu.au', {
            email: 'admin@kings.edu.au',
            defaultRole: 'admin',
            userRoles: [],
        });
        const teacherContext = testEnv.authenticatedContext(teacherEmail, {
            email: teacherEmail,
            defaultRole: 'teacher',
            userRoles: [],
        });

        await assertSucceeds(adminContext.firestore().collection('canvasSyncState').doc('main').get());
        await assertSucceeds(adminContext.firestore().collection('canvasSyncLog').doc('log-1').get());
        await assertFails(teacherContext.firestore().collection('canvasSyncState').doc('main').get());
        await assertFails(teacherContext.firestore().collection('canvasSyncLog').doc('log-1').get());
    });
});
