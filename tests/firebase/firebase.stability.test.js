jest.mock('server-only', () => ({}), { virtual: true });
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { scheduleMutation } = require('@/lib/scheduling/service');
const { calculateHours } = require('@/lib/scheduling/hours');
const { randomUUID } = require('crypto');
const fs = require('fs'), path = require('path');
let env, app, db;
jest.setTimeout(30000);
const teacher = { email: 'mienna@kings.edu.au', defaultRole: 'teacher', userRoles: [] };
const tutor = { email: 'tutor@kings.edu.au', defaultRole: 'tutor', userRoles: [] };
const otherTutor = { email: 'other-tutor@kings.edu.au', defaultRole: 'tutor', userRoles: [] };
const student = { email: 'student@kings.edu.au', defaultRole: 'student', userRoles: [] };
const start = new Date('2027-05-03T05:00:00Z'), end = new Date(+start + 3600000), now = new Date(+start - 86400000);
const event = (extra = {}) => ({ title: 'Stability session', start, end, staff: [{ value: tutor.email }], students: [{ value: student.email }], staffEmails: [tutor.email], studentEmails: [student.email], emailsList: [tutor.email, student.email], recurring: null, workType: 'work', workStatus: 'notCompleted', preference: 'General', createdByStudent: true, approvalStatus: 'pending', ...extra });
const call = (input, actor = teacher) => scheduleMutation(db, actor, { operationId: randomUUID(), ...input }, { now: () => now });
const pending = (id, extra = {}) => db.collection('studentEventRequests').doc(id).set(event(extra));
const approved = (id, extra = {}) => db.collection('shifts').doc(id).set(event({ createdByStudent: false, approvalStatus: 'approved', ...extra }));
beforeAll(async () => {
 process.env.FIRESTORE_EMULATOR_HOST = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080');
 env = await initializeTestEnvironment({ projectId: 'demo-talloc-stability-tests', firestore: { host: '127.0.0.1', port: Number((process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':').at(-1)), rules: fs.readFileSync(path.join(__dirname, '../../firebase/firestore.rules'), 'utf8') } });
 app = initializeApp({ projectId: 'demo-talloc-stability-tests' }, 'stability-tests'); db = getFirestore(app);
});
beforeEach(async () => {
 await env.clearFirestore();
 for (const user of [teacher, tutor, otherTutor, student]) await db.collection('users').doc(user.email).set(user);
 await db.collection('studentTutorEligibility').doc(student.email).set({ eligibleTutorEmails: [tutor.email, otherTutor.email] });
});
afterAll(async () => { await env?.cleanup(); if (db) await db.terminate(); if (app) await deleteApp(app); });

test('two concurrent approvals cannot book the same student with two different tutors', async () => {
 await pending('one'); await pending('two', { staff: [{ value: otherTutor.email }], staffEmails: [otherTutor.email], emailsList: [otherTutor.email, student.email] });
 const outcomes = await Promise.allSettled([call({ action: 'approve', id: 'one' }), call({ action: 'approve', id: 'two' })]);
 expect(outcomes.filter(result => result.status === 'fulfilled')).toHaveLength(1);
 expect((await db.collection('shifts').get()).size).toBe(1);
 expect((await db.collection('studentEventRequests').get()).docs[0].data().approvalStatus).toBe('denied');
});
test('a student cannot move a pending request into their approved session with another tutor', async () => {
 await approved('busy', { staff: [{ value: otherTutor.email }] });
 await pending('pending', { start: new Date(+end + 3600000), end: new Date(+end + 7200000) });
 await approved('work', { students: [], studentEmails: [], start, end: new Date(+end + 7200000) });
 await expect(call({ action: 'update', collectionName: 'studentEventRequests', id: 'pending', data: { start, end } }, student)).rejects.toThrow(/conflict/i);
 expect((await db.collection('studentEventRequests').doc('pending').get()).data().start.toMillis()).toBe(+end + 3600000);
});
test('new student assignments reject a disabled tutor while completed history stays editable', async () => {
 await db.collection('users').doc(tutor.email).update({ disabled: true }); await pending('pending');
 await expect(call({ action: 'approve', id: 'pending' })).rejects.toThrow(/disabled/i);
 expect((await db.collection('studentEventRequests').doc('pending').get()).data().approvalStatus).toBe('pending');
 await approved('history', { workStatus: 'completed' });
 await expect(call({ action: 'update', id: 'history', data: { title: 'Historical correction' } })).resolves.toBeTruthy();
});
test('a stale student edit after approval cannot resurrect a pending request', async () => {
 await pending('pending'); const result = await call({ action: 'approve', id: 'pending' });
 await expect(call({ action: 'update', collectionName: 'studentEventRequests', id: 'pending', data: { title: 'Stale edit' } }, student)).rejects.toMatchObject({ status: 409 });
 expect((await db.collection('shifts').doc(result.id).get()).data().title).toBe('Stability session');
 expect((await db.collection('studentEventRequests').get()).empty).toBe(true);
});
test('an approval that crosses its deadline during transaction reads rolls back all effects', async () => {
 await pending('pending'); let reads = 0;
 await expect(scheduleMutation(db, teacher, { action: 'approve', id: 'pending', operationId: randomUUID() }, { now: () => new Date(+start + 900000 + (++reads === 1 ? -1 : 1)) })).rejects.toThrow(/deadline/i);
 expect((await db.collection('studentEventRequests').doc('pending').get()).exists).toBe(true);
 for (const name of ['shifts', 'bookingNotifications', 'tutorBookingGuards', 'schedulingOperations']) expect((await db.collection(name).get()).empty).toBe(true);
});
test('skip conflicting dates cannot create an empty recurring series', async () => {
 for (const weeks of [0, 1]) await approved(`busy-${weeks}`, { start: new Date(+start + weeks * 7 * 86400000), end: new Date(+end + weeks * 7 * 86400000) });
 await expect(call({ action: 'create', collectionName: 'shifts', allowSkipConflicts: true, data: event({ recurring: 'weekly', occurenceNum: 2 }) })).rejects.toThrow(/All occurrences conflict/);
 expect((await db.collection('shifts').get()).size).toBe(2); expect((await db.collection('schedulingOperations').get()).empty).toBe(true);
});
test('duplicate case variants of the same tutor/student are one participant on approval', async () => {
 await pending('duplicates', { staff: [{ value: tutor.email }, { value: tutor.email.toUpperCase() }], students: [{ value: student.email }, { value: student.email.toUpperCase() }] });
 const result = await call({ action: 'approve', id: 'duplicates' });
 const saved = (await db.collection('shifts').doc(result.id).get()).data();
 expect(saved.staff).toHaveLength(1); expect(saved.students).toHaveLength(1); expect((await db.collection('bookingNotifications').get()).size).toBe(1);
});
test.each(['unknown', 10, null])('invalid completion status %j cannot corrupt an existing shift', async workStatus => {
 await approved('work', { students: [], studentEmails: [] });
 await expect(call({ action: 'update', id: 'work', data: { workStatus } })).rejects.toThrow(/completion status/i);
 expect((await db.collection('shifts').doc('work').get()).data().workStatus).toBe('notCompleted');
});
test('new Work covering pending requests does not deny them', async () => {
 await pending('pending'); await call({ action: 'create', data: event({ students: [], studentEmails: [] }) });
 expect((await db.collection('studentEventRequests').doc('pending').get()).data().approvalStatus).toBe('pending');
 expect((await db.collection('bookingNotifications').get()).empty).toBe(true);
});
test('the 30-student limit includes a requester who was omitted from the submitted group', async () => {
 const peers = Array.from({ length: 30 }, (_, index) => ({ value: `peer${index}@kings.edu.au` }));
 await expect(call({ action: 'create', collectionName: 'studentEventRequests', data: event({ students: peers }) }, student)).rejects.toThrow(/30 students/);
 expect((await db.collection('studentEventRequests').get()).empty).toBe(true);
});
test('operation identifiers are scoped to their actor and cannot replay another teacher’s result', async () => {
 const operationId = randomUUID(); const work = event({ students: [], studentEmails: [] });
 const one = await call({ action: 'create', operationId, data: work });
 const two = await call({ action: 'create', operationId, data: { ...work, title: 'Other teacher' } }, { ...teacher, email: 'teacher@kings.edu.au' });
 expect(one.id).not.toBe(two.id); expect((await db.collection('shifts').get()).size).toBe(2);
});
test('an approved legacy mixed-case tutor can still be assigned and complete their session', async () => {
 await db.collection('users').doc(tutor.email).delete(); const legacy = 'TuTor@Kings.edu.au'; await db.collection('users').doc(legacy).set({ ...tutor, email: legacy }); await pending('pending');
 const result = await call({ action: 'approve', id: 'pending' }); await call({ action: 'complete', id: result.id, data: { workStatus: 'completed' } }, { ...tutor, email: legacy });
 const saved = (await db.collection('shifts').doc(result.id).get()).data(); expect(calculateHours([saved]).paidMs).toBe(3600000);
});

test('a stale teacher editor cannot undo completion or overwrite another tab’s time edit', async () => {
 await approved('work', { students: [], studentEmails: [] });
 await call({ action: 'complete', id: 'work', expectedRevision: 0, data: { workStatus: 'completed' } }, tutor);
 await expect(call({ action: 'update', id: 'work', expectedRevision: 0, data: { title: 'Old editor', workStatus: 'notCompleted' } })).rejects.toMatchObject({ status: 409 });
 const saved = (await db.collection('shifts').doc('work').get()).data(); expect(saved.workStatus).toBe('completed'); expect(saved.revision).toBe(1);
 await call({ action: 'update', id: 'work', expectedRevision: 1, data: { end: new Date(+end + 3600000) } });
 await expect(call({ action: 'complete', id: 'work', expectedRevision: 1, data: { workStatus: 'notCompleted' } }, tutor)).rejects.toMatchObject({ status: 409 });
 expect((await db.collection('shifts').doc('work').get()).data().end.toMillis()).toBe(+end + 3600000);
});
test('a lost successful approval can be retried after its deadline without creating another session', async () => {
 await pending('pending'); const operationId = randomUUID(); const input = { action: 'approve', id: 'pending', operationId };
 const first = await call(input); const retry = await scheduleMutation(db, teacher, input, { now: () => new Date(+start + 86400000) });
 expect(retry.id).toBe(first.id); expect((await db.collection('shifts').get()).size).toBe(1); expect((await db.collection('bookingNotifications').get()).size).toBe(1);
});
test('back-to-back sessions for one student with different tutors remain possible', async () => {
 await pending('one'); await pending('two', { start: end, end: new Date(+end + 3600000), staff: [{ value: otherTutor.email }] });
 await Promise.all([call({ action: 'approve', id: 'one' }), call({ action: 'approve', id: 'two' })]); expect((await db.collection('shifts').get()).size).toBe(2);
});
