jest.mock('server-only', () => ({}), { virtual: true });
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { scheduleMutation } = require('@/lib/scheduling/service');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
let env, app, db;
jest.setTimeout(30000);
const teacher = { email: 'mienna@kings.edu.au', defaultRole: 'admin', userRoles: ['teacher'] };
const tutor = { email: 'tutor@kings.edu.au', defaultRole: 'tutor', userRoles: [] };
const student = { email: 'student@kings.edu.au', defaultRole: 'student', userRoles: [] };
const start = new Date('2027-04-06T05:00:00Z');
const end = new Date(+start + 3600000);
const clock = new Date(+start - 86400000);
const data = (overrides = {}) => ({ title: 'Student session', start, end, recurring: null, createdByStudent: true, approvalStatus: 'pending', workType: 'work', workStatus: 'notCompleted',
    staff: [{ value: tutor.email }], students: [{ value: student.email }], staffEmails: [tutor.email], studentEmails: [student.email], emailsList: [tutor.email, student.email], ...overrides });
const call = (input, actor = teacher, time = clock) => scheduleMutation(db, actor, { operationId: randomUUID(), ...input }, { now: () => time });
const seed = (id, overrides = {}) => db.collection('studentEventRequests').doc(id).set(data(overrides));
beforeAll(async () => {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    env = await initializeTestEnvironment({ projectId: 'demo-talloc-scheduling-tests', firestore: { host: '127.0.0.1', port: 8080, rules: fs.readFileSync(path.join(__dirname, '../../firebase/firestore.rules'), 'utf8') } });
    app = initializeApp({ projectId: 'demo-talloc-scheduling-tests' }, 'scheduling-tests'); db = getFirestore(app);
});
beforeEach(async () => { await env.clearFirestore(); await db.collection('users').doc(tutor.email).set(tutor); await db.collection('studentTutorEligibility').doc(student.email).set({ eligibleTutorEmails: [tutor.email] }); });
afterAll(async () => { await env?.cleanup(); if (db) await db.terminate(); if (app) await deleteApp(app); });

test('concurrent approval converts once, auto-denies the loser and writes recipient notices atomically', async () => {
    await seed('a'); await seed('b');
    const results = await Promise.allSettled([call({ action: 'approve', id: 'a' }), call({ action: 'approve', id: 'b' })]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect((await db.collection('shifts').get()).size).toBe(1);
    const remaining = await db.collection('studentEventRequests').get(); expect(remaining.size).toBe(1); expect(remaining.docs[0].data().approvalStatus).toBe('denied');
    const notices = await db.collection('bookingNotifications').get(); expect(notices.docs.map(doc => doc.data().kind).sort()).toEqual(['approved', 'assigned', 'denied']);
});
test('concurrent different-time bookings both succeed', async () => {
    await seed('a'); await seed('b', { start: end, end: new Date(+end + 3600000) });
    await Promise.all([call({ action: 'approve', id: 'a' }), call({ action: 'approve', id: 'b' })]); expect((await db.collection('shifts').get()).size).toBe(2);
});
test('general Work overlaps approval while legacy student bookings block it', async () => {
    await seed('a'); await db.collection('shifts').doc('work').set(data({ students: [], createdByStudent: false, approvalStatus: 'approved' }));
    await call({ action: 'approve', id: 'a' });
    await seed('b'); await expect(call({ action: 'approve', id: 'b' })).rejects.toThrow('Scheduling conflict');
});
test('recurring conflicts beyond 52 weeks are checked', async () => {
    await seed('a'); const base = require('luxon').DateTime.fromJSDate(start, { zone: 'Australia/Sydney' }).minus({ weeks: 70 }).toJSDate();
    await db.collection('shifts').doc('recurring').set(data({ createdByStudent: false, recurring: 'weekly', start: base, end: new Date(+base + 3600000), approvalStatus: 'approved' }));
    await expect(call({ action: 'approve', id: 'a' })).rejects.toThrow('Scheduling conflict');
});
test('approval uses the saved deadline and saved duration, resets completion and preserves creation time', async () => {
    const createdAt = new Date(+clock - 86400000); await seed('a', { createdAt, workStatus: 'completed' });
    const result = await call({ action: 'approve', id: 'a', data: { title: 'Edited' } }, teacher, new Date(+start + 900000));
    const shift = (await db.collection('shifts').doc(result.id).get()).data();
    expect(shift.start.toMillis()).toBe(+start); expect(shift.end.toMillis()).toBe(+end); expect(shift.createdAt.toMillis()).toBe(+createdAt); expect(shift.workStatus).toBe('notCompleted');
    await seed('late'); await expect(call({ action: 'approve', id: 'late', data: { start: new Date(+start + 86400000), end: new Date(+end + 86400000) } }, teacher, new Date(+start + 900001))).rejects.toThrow('15 minutes');
});
test('failed writes preserve request and do not emit notices', async () => {
    await seed('a');
    const failing = Object.create(db); failing.runTransaction = operation => db.runTransaction(transaction => {
        const set = transaction.set.bind(transaction); transaction.set = (ref, ...args) => { if (ref.parent.id === 'shifts') throw new Error('Injected write failure'); return set(ref, ...args); }; return operation(transaction);
    });
    await expect(scheduleMutation(failing, teacher, { action: 'approve', id: 'a', operationId: randomUUID() }, { now: () => clock })).rejects.toThrow('Injected');
    expect((await db.collection('studentEventRequests').doc('a').get()).exists).toBe(true); expect((await db.collection('bookingNotifications').get()).empty).toBe(true);
});
test('idempotent retry returns the same shift without duplicate notices', async () => {
    await seed('a'); const input = { action: 'approve', id: 'a', operationId: randomUUID() };
    const first = await call(input); const second = await call(input); expect(first.id).toBe(second.id); expect((await db.collection('shifts').get()).size).toBe(1); expect((await db.collection('bookingNotifications').get()).size).toBe(2);
});
test('student requests use combined Work and availability and always stay pending', async () => {
    await db.collection('tutorAvailabilities').doc('available').set({ tutor: tutor.email, start: new Date(+start - 3600000), end: start });
    await db.collection('shifts').doc('work').set(data({ students: [], createdByStudent: false, approvalStatus: 'approved' }));
    const result = await call({ action: 'create', collectionName: 'studentEventRequests', data: data({ start: new Date(+start - 1800000), approvalStatus: 'approved', additionalStudents: ['Other Student'] }) }, student);
    const request = (await db.collection('studentEventRequests').doc(result.id).get()).data(); expect(request.approvalStatus).toBe('pending'); expect(request.additionalStudents).toEqual(['Other Student']); expect(request.createdAt.toMillis()).toBe(+clock);
    await call({ action: 'approve', id: result.id });
    await expect(call({ action: 'create', collectionName: 'studentEventRequests', data: data() }, student)).rejects.toThrow('Scheduling conflict');
});
test('student cannot cancel or move an approved session; tutor cannot complete another tutor’s shift', async () => {
    await seed('a'); const result = await call({ action: 'approve', id: 'a' });
    await expect(call({ action: 'delete', id: result.id }, student)).rejects.toMatchObject({ status: 403 });
    await expect(call({ action: 'update', id: result.id, data: { start: end } }, student)).rejects.toMatchObject({ status: 403 });
    await expect(call({ action: 'complete', id: result.id, data: { workStatus: 'completed' } }, { ...tutor, email: 'other@kings.edu.au' })).rejects.toMatchObject({ status: 403 });
    await call({ action: 'complete', id: result.id, data: { workStatus: 'completed' } }, tutor);
    expect((await db.collection('shifts').doc(result.id).get()).data().workStatus).toBe('completed');
});
test('teacher-only accounts create and complete without tutor acceptance', async () => {
    const teacherOnly = { email: 'teacher@kings.edu.au', defaultRole: 'teacher', userRoles: [] };
    const result = await call({ action: 'create', data: data({ createdByStudent: false }) }, teacherOnly);
    await call({ action: 'complete', id: result.id, data: { workStatus: 'completed' } }, teacherOnly);
    expect((await db.collection('shifts').doc(result.id).get()).data().workStatus).toBe('completed');
});
test('loss of coverage notifies Michael without removing the student booking', async () => {
    await db.collection('shifts').doc('work').set(data({ students: [], createdByStudent: false, approvalStatus: 'approved' }));
    await seed('a'); const result = await call({ action: 'approve', id: 'a' });
    await call({ action: 'delete', id: 'work' });
    expect((await db.collection('shifts').doc(result.id).get()).exists).toBe(true);
    const notices = await db.collection('bookingNotifications').where('kind', '==', 'coverage-lost').get(); expect(notices.size).toBe(1); expect(notices.docs[0].data().recipientEmail).toBe(teacher.email);
});
test('availability loss warns only when other Work does not still cover the session', async () => {
    await db.collection('tutorAvailabilities').doc('available').set({ tutor: tutor.email, start, end });
    await db.collection('shifts').doc('work').set(data({ students: [], createdByStudent: false, approvalStatus: 'approved' }));
    await seed('a'); await call({ action: 'approve', id: 'a' });
    await call({ action: 'delete', collectionName: 'tutorAvailabilities', id: 'available' }, tutor);
    expect((await db.collection('bookingNotifications').where('kind', '==', 'coverage-lost').get()).empty).toBe(true);
});
test('detaching an occurrence is atomic and preserves all other occurrences', async () => {
    await db.collection('shifts').doc('series').set(data({ createdByStudent: false, approvalStatus: 'approved', recurring: 'weekly', occurenceNum: 3, students: [] }));
    const result = await call({ action: 'detach', id: 'series', occurrenceIndex: 1, data: { workStatus: 'completed' } }, tutor);
    expect((await db.collection('shifts').doc('series').get()).data().eventExceptions).toEqual([1]);
    const shift = (await db.collection('shifts').doc(result.id).get()).data(); expect(shift.recurring).toBeNull(); expect(shift.start.toMillis()).toBe(+start + 7 * 86400000);
    await expect(call({ action: 'detach', id: 'series', occurrenceIndex: 1, data: { workStatus: 'completed' } }, tutor)).rejects.toThrow('no longer available');
});
test('recurring booking offers skip-conflicting dates and records only approved occurrences', async () => {
    await db.collection('shifts').doc('busy').set(data({ createdByStudent: false, approvalStatus: 'approved', start: new Date(+start + 7 * 86400000), end: new Date(+end + 7 * 86400000) }));
    const input = { action: 'create', data: data({ recurring: 'weekly', occurenceNum: 3 }) };
    await expect(call(input)).rejects.toMatchObject({ details: { canSkip: true } });
    const result = await call({ ...input, allowSkipConflicts: true }); expect(result.skippedDates).toHaveLength(1);
    expect((await db.collection('shifts').doc(result.id).get()).data().eventExceptions).toEqual([1]);
});
test('renaming Tutoring to Work cannot bypass subject eligibility or coach separation', async () => {
    await seed('a'); await db.collection('studentTutorEligibility').doc(student.email).set({ eligibleTutorEmails: [] });
    await expect(call({ action: 'approve', id: 'a' })).rejects.toThrow('eligible');
    await expect(call({ action: 'create', data: data({ students: [], workType: 'coaching' }) })).rejects.toThrow('coach role');
});
test('recipient privacy and no direct scheduling bypass', async () => {
    await seed('a'); await call({ action: 'approve', id: 'a' });
    const client = env.authenticatedContext(student.email, { email: student.email, defaultRole: 'student', userRoles: [] }).firestore();
    const notices = await client.collection('bookingNotifications').where('recipientEmail', '==', student.email).get(); expect(notices.size).toBe(1);
    await global.assertFails(client.collection('bookingNotifications').get());
    await global.assertFails(client.collection('studentEventRequests').doc('injected').set(data()));
    await global.assertFails(client.collection('tutorBookingGuards').doc('injected').set({ revision: 1 }));
});

test('changing the source collection cannot bypass approval conflicts', async () => {
    await seed('a'); await db.collection('shifts').doc('busy').set(data({ createdByStudent: false, approvalStatus: 'approved' }));
    await expect(call({ action: 'approve', id: 'a', collectionName: 'tutorAvailabilities', data: { tutor: teacher.email } }, { ...teacher, userRoles: ['teacher', 'tutor'] })).rejects.toThrow('Scheduling conflict');
});
test('student requests cannot become coaching to bypass subject eligibility', async () => {
    await db.collection('users').doc(tutor.email).set({ ...tutor, userRoles: ['coach'] });
    await db.collection('tutorAvailabilities').doc('available').set({ tutor: tutor.email, start, end, workType: ['work'] });
    await db.collection('studentTutorEligibility').doc(student.email).set({ eligibleTutorEmails: [] });
    await expect(call({ action: 'create', collectionName: 'studentEventRequests', data: data({ workType: 'coaching' }) }, student)).rejects.toThrow('eligible');
});
test('manual booking and approval use the same concurrency guard', async () => {
    await seed('a'); const results = await Promise.allSettled([call({ action: 'approve', id: 'a' }), call({ action: 'create', data: data() })]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1); expect((await db.collection('shifts').get()).size).toBe(1);
});

test('completing an unchanged recurring booking does not require current subject eligibility', async () => {
    await db.collection('shifts').doc('series').set(data({ approvalStatus: 'approved', recurring: 'weekly', occurenceNum: 3 }));
    await db.collection('studentTutorEligibility').doc(student.email).set({ eligibleTutorEmails: [] });
    const result = await call({ action: 'detach', id: 'series', occurrenceIndex: 1, data: { workStatus: 'completed' } }, tutor);
    expect((await db.collection('shifts').doc(result.id).get()).data().workStatus).toBe('completed');
});

test('adding named group students to Work rechecks conflicts', async () => {
    await db.collection('shifts').doc('work').set(data({ students: [], createdByStudent: false, approvalStatus: 'approved' }));
    await db.collection('shifts').doc('busy').set(data({ createdByStudent: false, approvalStatus: 'approved' }));
    await expect(call({ action: 'update', id: 'work', data: { additionalStudents: ['Another student'] } })).rejects.toThrow('Scheduling conflict');
});
test('adding recurrence or extending its end rechecks future conflicts', async () => {
    const future = new Date(+start + 7 * 86400000), futureEnd = new Date(+end + 7 * 86400000);
    await db.collection('shifts').doc('session').set(data({ createdByStudent: false, approvalStatus: 'approved' }));
    await db.collection('shifts').doc('busy').set(data({ createdByStudent: false, approvalStatus: 'approved', start: future, end: futureEnd }));
    await expect(call({ action: 'update', id: 'session', data: { recurring: 'weekly', occurenceNum: 3 } })).rejects.toThrow('Scheduling conflict');
    await db.collection('shifts').doc('session').update({ recurring: 'weekly', occurenceNum: 3, until: start });
    await expect(call({ action: 'until', id: 'session', until: future })).rejects.toThrow('Scheduling conflict');
});
test('student cannot bypass the one-tutor rule with an empty student list', async () => {
    await db.collection('users').doc('other@kings.edu.au').set({ ...tutor, email: 'other@kings.edu.au' });
    await db.collection('tutorAvailabilities').doc('available').set({ tutor: tutor.email, start, end });
    await expect(call({ action: 'create', collectionName: 'studentEventRequests', data: data({ students: [], staff: [tutor.email, 'other@kings.edu.au'] }) }, student)).rejects.toThrow('one tutor');
});
test('editing an old open-ended series preserves recurrence and checks upcoming dates', async () => {
    const base = require('luxon').DateTime.fromJSDate(start, { zone: 'Australia/Sydney' }).minus({ weeks: 70 }).toJSDate();
    await db.collection('shifts').doc('old').set(data({ students: [], createdByStudent: false, approvalStatus: 'approved', recurring: 'weekly', start: base, end: new Date(+base + 3600000) }));
    await call({ action: 'update', id: 'old', data: { title: 'Renamed Work' } });
    expect((await db.collection('shifts').doc('old').get()).data().occurenceNum).toBeFalsy();
    await db.collection('shifts').doc('busy').set(data({ createdByStudent: false, approvalStatus: 'approved' }));
    await expect(call({ action: 'update', id: 'old', data: { additionalStudents: ['Named student'] } })).rejects.toThrow('Scheduling conflict');
});
test('old recurring occurrences can be completed beyond the first year', async () => {
    const base = require('luxon').DateTime.fromJSDate(start, { zone: 'Australia/Sydney' }).minus({ weeks: 70 }).toJSDate();
    await db.collection('shifts').doc('old').set(data({ students: [], createdByStudent: false, approvalStatus: 'approved', recurring: 'weekly', start: base, end: new Date(+base + 3600000) }));
    const result = await call({ action: 'detach', id: 'old', occurrenceIndex: 70, data: { workStatus: 'completed' } }, tutor);
    expect((await db.collection('shifts').doc(result.id).get()).data().start.toMillis()).toBe(+start);
});
test('removing the last student preserves approval and makes the event general Work despite old class metadata', async () => {
    await db.collection('shifts').doc('session').set(data({ approvalStatus: 'approved', classes: [{ value: 'legacy-class' }] }));
    await call({ action: 'update', id: 'session', data: { students: [], additionalStudents: [] } });
    await seed('new');
    await call({ action: 'approve', id: 'new' });
    expect((await db.collection('shifts').doc('session').get()).data().approvalStatus).toBe('approved');
});
test('removing an old recurring Work series warns about current supported bookings', async () => {
    const base = require('luxon').DateTime.fromJSDate(start, { zone: 'Australia/Sydney' }).minus({ weeks: 70 }).toJSDate();
    await db.collection('shifts').doc('old').set(data({ students: [], createdByStudent: false, approvalStatus: 'approved', recurring: 'weekly', start: base, end: new Date(+base + 3600000) }));
    await seed('a'); await call({ action: 'approve', id: 'a' });
    await call({ action: 'delete', id: 'old' });
    expect((await db.collection('bookingNotifications').where('kind', '==', 'coverage-lost').get()).size).toBe(1);
});

test('cached class participants are resolved while unknown legacy classes stay occupied', async () => {
    await db.collection('canvasEnrollments').doc('enrollment').set({ courseId: 'known-class', email: student.email, userName: 'Student' });
    const result = await call({ action: 'create', data: data({ students: [], classes: [{ value: 'known-class' }] }) });
    expect((await db.collection('shifts').doc(result.id).get()).data().students[0].value).toBe(student.email);
    await db.collection('shifts').doc('unknown').set(data({ students: [], classes: [{ value: 'unknown-class' }], start: end, end: new Date(+end + 3600000), createdByStudent: false, approvalStatus: 'approved' }));
    await seed('a', { start: end, end: new Date(+end + 3600000) });
    await expect(call({ action: 'approve', id: 'a' })).rejects.toThrow('Scheduling conflict');
});
test('extending an approved recurring booking denies competing pending requests atomically', async () => {
    const future = new Date(+start + 7 * 86400000), futureEnd = new Date(+end + 7 * 86400000);
    await db.collection('shifts').doc('series').set(data({ recurring: 'weekly', occurenceNum: 3, until: start, createdByStudent: false, approvalStatus: 'approved' }));
    await seed('a', { start: future, end: futureEnd });
    await call({ action: 'until', id: 'series', until: future });
    expect((await db.collection('studentEventRequests').doc('a').get()).data().approvalStatus).toBe('denied');
});

test('coverage-loss checks include adjoining Work on both sides of an edited shift', async () => {
    for (const [id, offset] of [['before', -1], ['middle', 0], ['after', 1]]) await db.collection('shifts').doc(id).set(data({ students: [], createdByStudent: false, approvalStatus: 'approved', start: new Date(+start + offset * 3600000), end: new Date(+end + offset * 3600000) }));
    await seed('a', { start: new Date(+start - 1800000), end: new Date(+end + 1800000) });
    await call({ action: 'approve', id: 'a' });
    await call({ action: 'delete', id: 'middle' });
    expect((await db.collection('bookingNotifications').where('kind', '==', 'coverage-lost').get()).size).toBe(1);
});
test('editing a legacy recurring series checks bookings more than a year ahead', async () => {
    const future = require('luxon').DateTime.fromJSDate(start, { zone: 'Australia/Sydney' }).plus({ weeks: 110 });
    await db.collection('shifts').doc('old').set(data({ students: [], createdByStudent: false, approvalStatus: 'approved', recurring: 'weekly' }));
    await db.collection('shifts').doc('future').set(data({ createdByStudent: false, approvalStatus: 'approved', start: future.toJSDate(), end: future.plus({ hours: 1 }).toJSDate() }));
    await expect(call({ action: 'update', id: 'old', data: { additionalStudents: ['Named student'] } })).rejects.toThrow('Scheduling conflict');
});

test('removing explicit students does not silently refill them from a cached class roster', async () => {
    await db.collection('canvasEnrollments').doc('enrollment').set({ courseId: 'known-class', email: student.email });
    await db.collection('shifts').doc('session').set(data({ approvalStatus: 'approved', classes: [{ value: 'known-class' }] }));
    await call({ action: 'update', id: 'session', data: { students: [], additionalStudents: [], classes: [{ value: 'known-class', label: 'New label only' }] } });
    await seed('a'); await call({ action: 'approve', id: 'a' });
    expect((await db.collection('shifts').doc('session').get()).data().students).toEqual([]);
});
test('adding a different class to general Work restores occupied student-session semantics', async () => {
    await db.collection('shifts').doc('work').set(data({ students: [], classes: [{ value: 'old-class' }], studentParticipantsResolved: true, createdByStudent: false, approvalStatus: 'approved' }));
    await db.collection('shifts').doc('busy').set(data({ createdByStudent: false, approvalStatus: 'approved' }));
    await expect(call({ action: 'update', id: 'work', data: { classes: [{ value: 'new-class' }] } })).rejects.toThrow('Scheduling conflict');
});

test('new and duplicated bookings reset completion and every meeting identifier', async () => {
    const result = await call({ action: 'create', data: data({ students: [], workStatus: 'completed', teamsEventId: 'old-series', teamsMeetingUrl: 'old-url', teamsJoinUrl: 'old-join', onlineMeetingId: 'old-online' }) });
    const saved = (await db.collection('shifts').doc(result.id).get()).data();
    expect(saved.workStatus).toBe('notCompleted');
    for (const key of ['teamsEventId', 'teamsMeetingUrl', 'teamsJoinUrl', 'onlineMeetingId']) expect(saved[key]).toBeNull();
});

test('changing class while clearing its old students cannot make an unresolved new class bookable', async () => {
    await db.collection('shifts').doc('session').set(data({ classes: [{ value: 'old-class' }], createdByStudent: false, approvalStatus: 'approved' }));
    await db.collection('shifts').doc('busy').set(data({ createdByStudent: false, approvalStatus: 'approved' }));
    await expect(call({ action: 'update', id: 'session', data: { students: [], additionalStudents: [], classes: [{ value: 'unknown-class' }] } })).rejects.toThrow('Scheduling conflict');
});
