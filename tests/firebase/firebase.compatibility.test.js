const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { Timestamp, serverTimestamp } = require('firebase/firestore');
let env, app, db;
const email = 'student@kings.edu.au', tutor = 'tutor@kings.edu.au';
const start = new Date('2027-04-06T05:00:00Z');
const client = (identity = email, role = 'student') => env.authenticatedContext(identity, {
    email: identity, defaultRole: role, userRoles: [],
}).firestore();
const notice = recipientEmail => ({ recipientEmail, kind: 'approved', title: 'Session', message: 'Approved', start, createdAt: new Date() });
beforeAll(async () => {
    process.env.FIRESTORE_EMULATOR_HOST = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080');
    env = await initializeTestEnvironment({ projectId: 'demo-talloc-compatible-rules', firestore: {
        host: '127.0.0.1', port: Number((process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':').at(-1)), rules: fs.readFileSync(path.join(__dirname, '../../firebase/firestore.compat.rules'), 'utf8'),
    } });
    app = initializeApp({ projectId: 'demo-talloc-compatible-rules' }, 'compatible-notices'); db = getFirestore(app);
});
beforeEach(async () => {
    await env.clearFirestore();
    await db.collection('bookingNotifications').doc('own').set(notice(email));
    await db.collection('bookingNotifications').doc('other').set(notice(tutor));
});
afterAll(async () => { await env?.cleanup(); await db?.terminate(); if (app) await deleteApp(app); });

test('a recipient reads only their notices, including a legacy mixed-case identity', async () => {
    for (const identity of [email, 'Student@Kings.edu.au']) {
        const own = client(identity).collection('bookingNotifications');
        expect((await assertSucceeds(own.where('recipientEmail', '==', email).get())).size).toBe(1);
        await assertSucceeds(own.doc('own').get());
        await assertFails(own.doc('other').get());
        await assertFails(own.get());
        await assertFails(own.where('recipientEmail', '==', tutor).get());
    }
});
test('notices stay server-written, including for an administrator', async () => {
    for (const role of ['student', 'admin']) {
        const ref = client(email, role).collection('bookingNotifications').doc('own');
        await assertFails(ref.set(notice(email)));
        await assertFails(ref.update({ message: 'changed' }));
        await assertFails(ref.delete());
    }
});
test('recipients acknowledge their own notices without gaining other profile or notice access', async () => {
    const states = client('Student@Kings.edu.au').collection('bookingNotificationState');
    const own = states.doc(email);
    await assertSucceeds(own.get());
    await assertSucceeds(own.set({ acknowledgedAt: Timestamp.fromDate(new Date(Date.now() - 1000)), updatedAt: serverTimestamp() }));
    await assertFails(states.doc(tutor).get());
    await assertFails(states.doc(tutor).set({ acknowledgedAt: Timestamp.now(), updatedAt: serverTimestamp() }));
    await assertFails(own.set({ acknowledgedAt: Timestamp.fromDate(new Date(Date.now() + 86400000)), updatedAt: serverTimestamp() }));
    await assertFails(own.set({ acknowledgedAt: Timestamp.now(), updatedAt: serverTimestamp(), defaultRole: 'admin' }));
    await assertFails(own.delete());
});
test('unauthenticated clients cannot read or acknowledge notices', async () => {
    const unauthenticated = env.unauthenticatedContext().firestore();
    await assertFails(unauthenticated.collection('bookingNotifications').doc('own').get());
    await assertFails(unauthenticated.collection('bookingNotificationState').doc(email).get());
    await assertFails(unauthenticated.collection('bookingNotificationState').doc(email).set({ acknowledgedAt: Timestamp.now(), updatedAt: serverTimestamp() }));
});
test('legacy teacher and tutor calendar writes remain compatible during migration', async () => {
    const shift = { title: 'Work', start, end: new Date(+start + 3600000), workStatus: 'notCompleted', emailsList: [tutor] };
    const admin = client('teacher@kings.edu.au', 'teacher').collection('shifts').doc('legacy');
    await assertSucceeds(admin.set(shift));
    await assertSucceeds(client(tutor, 'tutor').collection('shifts').doc('legacy').update({ workStatus: 'completed' }));
    await assertFails(client(email).collection('shifts').doc('legacy').update({ workStatus: 'completed' }));
    await assertSucceeds(admin.delete());
});
test('legacy students can still create their own eligible pending request', async () => {
    await db.collection('studentTutorEligibility').doc(email).set({ eligibleTutorEmails: [tutor] });
    await assertSucceeds(client().collection('studentEventRequests').doc('pending').set({
        title: 'Session', start, end: new Date(+start + 3600000), approvalStatus: 'pending',
        studentEmails: [email], staffEmails: [tutor], emailsList: [email, tutor], classes: [],
    }));
});
