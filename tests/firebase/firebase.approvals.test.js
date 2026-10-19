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
const data = (overrides = {}) => ({ title: 'Student session', preference: 'General', start, end, recurring: null, createdByStudent: true, approvalStatus: 'pending', workType: 'work', workStatus: 'notCompleted',
    staff: [{ value: tutor.email }], students: [{ value: student.email }], staffEmails: [tutor.email], studentEmails: [student.email], emailsList: [tutor.email, student.email], ...overrides });
const call = (input, actor = teacher, time = clock) => scheduleMutation(db, actor, { operationId: randomUUID(), ...input }, { now: () => time });
const seed = (id, overrides = {}) => db.collection('studentEventRequests').doc(id).set(data(overrides));
beforeAll(async () => {
    process.env.FIRESTORE_EMULATOR_HOST = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080');
    env = await initializeTestEnvironment({ projectId: 'demo-talloc-scheduling-tests', firestore: { host: '127.0.0.1', port: Number((process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':').at(-1)), rules: fs.readFileSync(path.join(__dirname, '../../firebase/firestore.rules'), 'utf8') } });
    app = initializeApp({ projectId: 'demo-talloc-scheduling-tests' }, 'scheduling-tests'); db = getFirestore(app);
});
beforeEach(async () => { await env.clearFirestore(); await db.collection('users').doc(tutor.email).set(tutor); await db.collection('users').doc(student.email).set(student); await db.collection('studentTutorEligibility').doc(student.email).set({ eligibleTutorEmails: [tutor.email] }); });
afterAll(async () => { await env?.cleanup(); if (db) await db.terminate(); if (app) await deleteApp(app); });

test('concurrent approval converts once, auto-denies the loser and writes recipient notices atomically', async () => {
    await seed('a'); await seed('b');
    const results = await Promise.allSettled([call({ action: 'approve', id: 'a' }), call({ action: 'approve', id: 'b' })]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect((await db.collection('shifts').get()).size).toBe(1);
    const remaining = await db.collection('studentEventRequests').get(); expect(remaining.size).toBe(1); expect(remaining.docs[0].data().approvalStatus).toBe('denied');
    const notices = await db.collection('bookingNotifications').get(); expect(notices.docs.map(doc => doc.data().kind).sort()).toEqual(['approved', 'denied']);
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
    const first = await call(input); const second = await call(input); expect(first.id).toBe(second.id); expect((await db.collection('shifts').get()).size).toBe(1); expect((await db.collection('bookingNotifications').get()).size).toBe(1);
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

test('saved general Work cannot be converted by adding group students', async () => {
    await db.collection('shifts').doc('work').set(data({ students: [], createdByStudent: false, approvalStatus: 'approved' }));
    await db.collection('shifts').doc('busy').set(data({ createdByStudent: false, approvalStatus: 'approved' }));
    await expect(call({ action: 'update', id: 'work', data: { additionalStudents: ['Another student'] } })).rejects.toThrow('Create a separate student session');
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
    await db.collection('shifts').doc('old').set(data({ createdByStudent: false, approvalStatus: 'approved', recurring: 'weekly', start: base, end: new Date(+base + 3600000) }));
    await call({ action: 'update', id: 'old', data: { title: 'Renamed session' } });
    expect((await db.collection('shifts').doc('old').get()).data().occurenceNum).toBeFalsy();
    await db.collection('shifts').doc('busy').set(data({ createdByStudent: false, approvalStatus: 'approved' }));
    await expect(call({ action: 'update', id: 'old', data: { start: new Date(+base + 1800000), end: new Date(+base + 5400000) } })).rejects.toThrow('Scheduling conflict');
});
test('old recurring occurrences can be completed beyond the first year', async () => {
    const base = require('luxon').DateTime.fromJSDate(start, { zone: 'Australia/Sydney' }).minus({ weeks: 70 }).toJSDate();
    await db.collection('shifts').doc('old').set(data({ students: [], createdByStudent: false, approvalStatus: 'approved', recurring: 'weekly', start: base, end: new Date(+base + 3600000) }));
    const result = await call({ action: 'detach', id: 'old', occurrenceIndex: 70, data: { workStatus: 'completed' } }, tutor);
    expect((await db.collection('shifts').doc(result.id).get()).data().start.toMillis()).toBe(+start);
});
test('saving an empty student session is rejected without changing approval or class metadata', async () => {
    await db.collection('shifts').doc('session').set(data({ approvalStatus: 'approved', classes: [{ value: 'legacy-class' }] }));
    await expect(call({ action: 'update', id: 'session', data: { students: [], additionalStudents: [] } })).rejects.toThrow('Add at least one student');
    await seed('new');
    await expect(call({ action: 'approve', id: 'new' })).rejects.toThrow('Scheduling conflict');
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
    await db.collection('shifts').doc('old').set(data({ createdByStudent: false, approvalStatus: 'approved', recurring: 'weekly' }));
    await db.collection('shifts').doc('future').set(data({ createdByStudent: false, approvalStatus: 'approved', start: future.toJSDate(), end: future.plus({ hours: 1 }).toJSDate() }));
    await expect(call({ action: 'update', id: 'old', data: { start: new Date(+start + 1800000), end: new Date(+end + 1800000) } })).rejects.toThrow('Scheduling conflict');
});

test('an empty explicit student list cannot be saved using cached class metadata', async () => {
    await db.collection('canvasEnrollments').doc('enrollment').set({ courseId: 'known-class', email: student.email });
    await db.collection('shifts').doc('session').set(data({ approvalStatus: 'approved', classes: [{ value: 'known-class' }] }));
    await expect(call({ action: 'update', id: 'session', data: { students: [], additionalStudents: [], classes: [{ value: 'known-class', label: 'New label only' }] } })).rejects.toThrow('Add at least one student');
    expect((await db.collection('shifts').doc('session').get()).data().students).toEqual([{ value: student.email }]);
});
test('adding a class cannot change a saved general Work shift into a student session', async () => {
    await db.collection('shifts').doc('work').set(data({ students: [], classes: [{ value: 'old-class' }], studentParticipantsResolved: true, createdByStudent: false, approvalStatus: 'approved' }));
    await db.collection('shifts').doc('busy').set(data({ createdByStudent: false, approvalStatus: 'approved' }));
    await expect(call({ action: 'update', id: 'work', data: { classes: [{ value: 'new-class' }] } })).rejects.toThrow('Create a separate student session');
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
    await expect(call({ action: 'update', id: 'session', data: { students: [], additionalStudents: [], classes: [{ value: 'unknown-class' }] } })).rejects.toThrow('Add at least one student');
});

test('a teacher can replace a student without resetting approval, completion or creation details', async () => {
    const replacement = 'replacement@kings.edu.au', createdAt = new Date(+clock - 86400000);
    await db.collection('studentTutorEligibility').doc(replacement).set({ eligibleTutorEmails: [tutor.email] });
    await db.collection('shifts').doc('session').set(data({ approvalStatus: 'approved', workStatus: 'completed', createdAt }));
    await call({ action: 'update', id: 'session', data: { students: [{ value: replacement }], additionalStudents: [] } });
    const saved = (await db.collection('shifts').doc('session').get()).data();
    expect(saved.studentEmails).toEqual([replacement]); expect(saved.emailsList).not.toContain(student.email);
    expect(saved.createdByStudent).toBe(true); expect(saved.approvalStatus).toBe('approved'); expect(saved.workStatus).toBe('completed');
    expect(saved.createdAt.toMillis()).toBe(+createdAt); expect(saved.start.toMillis()).toBe(+start); expect(saved.end.toMillis()).toBe(+end);
});
test('a student session can replace its account participant with a named group member', async () => {
    await db.collection('shifts').doc('session').set(data({ approvalStatus: 'approved' }));
    await call({ action: 'update', id: 'session', data: { students: [], additionalStudents: 'Replacement student' } });
    const saved = (await db.collection('shifts').doc('session').get()).data();
    expect(saved.additionalStudents).toEqual(['Replacement student']); expect(saved.approvalStatus).toBe('approved');
    await expect(call({ action: 'update', id: 'session', data: { additionalStudents: ' , \n ' } })).rejects.toThrow('Add at least one student');
});
test.each(['update', 'approve', 'detach'])('empty session safeguard also applies to %s without partial writes', async action => {
    if (action === 'approve') await seed('session');
    else await db.collection('shifts').doc('session').set(data({ approvalStatus: 'approved', ...(action === 'detach' && { recurring: 'weekly', occurenceNum: 3 }) }));
    await expect(call({ action, id: 'session', occurrenceIndex: 1, data: { students: [], additionalStudents: [] } })).rejects.toThrow('Add at least one student');
    expect((await db.collection(action === 'approve' ? 'studentEventRequests' : 'shifts').doc('session').get()).exists).toBe(true);
    if (action === 'detach') expect((await db.collection('shifts').doc('session').get()).data().eventExceptions || []).toEqual([]);
    expect((await db.collection('bookingNotifications').get()).empty).toBe(true);
});
test('a student session cannot be retyped as Coaching to bypass its participant safeguard', async () => {
    await db.collection('shifts').doc('session').set(data({ approvalStatus: 'approved' }));
    await expect(call({ action: 'update', id: 'session', data: { students: [], workType: 'coaching' } })).rejects.toThrow('must remain Work');
});
test('replacement students must still be eligible for their assigned tutor', async () => {
    await db.collection('shifts').doc('session').set(data({ approvalStatus: 'approved' }));
    await expect(call({ action: 'update', id: 'session', data: { students: ['ineligible@kings.edu.au'] } })).rejects.toThrow('eligible');
});
test.each(['work', 'availability'])('teacher cancellation restores bookability and preserves supporting %s', async support => {
    const collection = support === 'work' ? 'shifts' : 'tutorAvailabilities';
    await db.collection(collection).doc('support').set(support === 'work' ? data({ students: [], createdByStudent: false, approvalStatus: 'approved' }) : { tutor: tutor.email, start, end });
    await seed('a'); const approved = await call({ action: 'approve', id: 'a' });
    await expect(call({ action: 'create', collectionName: 'studentEventRequests', data: data() }, student)).rejects.toThrow('Scheduling conflict');
    await call({ action: 'delete', id: approved.id });
    expect((await db.collection(collection).doc('support').get()).exists).toBe(true);
    expect((await db.collection('shifts').doc(approved.id).get()).exists).toBe(false);
    const next = await call({ action: 'create', collectionName: 'studentEventRequests', data: data() }, student);
    expect((await db.collection('studentEventRequests').doc(next.id).get()).data().approvalStatus).toBe('pending');
});
test('unapproved and denied student sessions cannot be marked completed', async () => {
    for (const approvalStatus of ['pending', 'denied']) {
        await db.collection('shifts').doc(approvalStatus).set(data({ approvalStatus }));
        await expect(call({ action: 'complete', id: approvalStatus, data: { workStatus: 'completed' } })).rejects.toThrow('approved');
    }
});

test('student-selected group stays pending, includes its requester and notifies every selected student', async () => {
    const peer = 'peer@kings.edu.au';
    await db.collection('studentTutorEligibility').doc(peer).set({ eligibleTutorEmails: [tutor.email] });
    await db.collection('shifts').doc('work').set(data({ students: [], createdByStudent: false, approvalStatus: 'approved' }));
    const result = await call({ action: 'create', collectionName: 'studentEventRequests', data: data({ students: [{ value: peer }, { value: peer }], approvalStatus: 'approved', requesterEmail: peer }) }, student);
    const request = (await db.collection('studentEventRequests').doc(result.id).get()).data();
    expect(request.studentEmails).toEqual([student.email, peer]); expect(request.requesterEmail).toBe(student.email); expect(request.approvalStatus).toBe('pending');
    await expect(call({ action: 'update', collectionName: 'studentEventRequests', id: result.id, data: { students: [{ value: peer }] } }, { email: peer, defaultRole: 'student' })).rejects.toMatchObject({ status: 403 });
    await call({ action: 'update', collectionName: 'studentEventRequests', id: result.id, data: { students: [{ value: peer }] } }, student);
    await call({ action: 'approve', id: result.id });
    const approved = (await db.collection('shifts').doc(`approved-${result.id}`).get()).data(); expect(approved.requesterEmail).toBe(student.email); expect(approved.studentEmails).toEqual([student.email, peer]);
    const notices = (await db.collection('bookingNotifications').get()).docs.map(doc => doc.data());
    for (const email of [student.email, peer]) expect(notices.some(notice => notice.recipientEmail === email && notice.kind === 'approved')).toBe(true);
    await expect(call({ action: 'update', id: `approved-${result.id}`, data: { students: [] } }, student)).rejects.toMatchObject({ status: 403 });
});
test('every selected group student must have an eligible tutor, including on approval after eligibility changes', async () => {
    const peer = 'peer@kings.edu.au';
    await db.collection('shifts').doc('work').set(data({ students: [], createdByStudent: false, approvalStatus: 'approved' }));
    const input = { action: 'create', collectionName: 'studentEventRequests', data: data({ students: [{ value: student.email }, { value: peer }] }) };
    await expect(call(input, student)).rejects.toThrow('not eligible');
    await db.collection('studentTutorEligibility').doc(peer).set({ eligibleTutorEmails: [tutor.email] });
    const result = await call(input, student);
    await db.collection('studentTutorEligibility').doc(peer).set({ eligibleTutorEmails: [] });
    await expect(call({ action: 'approve', id: result.id })).rejects.toThrow('not eligible');
    expect((await db.collection('studentEventRequests').doc(result.id).get()).data().approvalStatus).toBe('pending');
    expect((await db.collection('shifts').doc(`approved-${result.id}`).get()).exists).toBe(false);
});
test('denial of a group request notifies all selected students without multiplying tutor hours', async () => {
    const peer = 'peer@kings.edu.au';
    await seed('group', { students: [{ value: student.email }, { value: peer }], requesterEmail: student.email, studentEmails: [student.email, peer] });
    await call({ action: 'deny', id: 'group' });
    const notices = (await db.collection('bookingNotifications').get()).docs.map(doc => doc.data());
    expect(notices.filter(notice => notice.kind === 'denied').map(notice => notice.recipientEmail).sort()).toEqual([peer, student.email].sort());
});

test('teacher-created and approved student sessions do not create tutor assignment banners', async () => {
    await call({ action: 'create', data: data({ createdByStudent: false, approvalStatus: 'approved' }) });
    expect((await db.collection('bookingNotifications').get()).empty).toBe(true);
    await seed('group', { start: end, end: new Date(+end + 3600000) });
    await call({ action: 'approve', id: 'group' });
    const notices = (await db.collection('bookingNotifications').get()).docs.map(doc => doc.data());
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({ recipientEmail: student.email, kind: 'approved' });
});

test.each([null, '', 'Unrecognised focus'])('student request with missing/invalid focus %j is rejected before writing', async preference => {
    await expect(call({ action: 'create', collectionName: 'studentEventRequests', data: data({ preference }) }, student)).rejects.toThrow('Select a session focus');
    expect((await db.collection('studentEventRequests').get()).empty).toBe(true);
});
test('focus and optional topics survive student edit, approval and later teacher edits', async () => {
    await db.collection('shifts').doc('work').set(data({ students: [], createdByStudent: false, approvalStatus: 'approved' }));
    const created = await call({ action: 'create', collectionName: 'studentEventRequests', data: data({ preference: 'Exam Help', sessionTopics: '  Quadratic equations  ' }) }, student);
    await call({ action: 'update', collectionName: 'studentEventRequests', id: created.id, data: { sessionTopics: '  Questions 4–8  ' } }, student);
    const request = (await db.collection('studentEventRequests').doc(created.id).get()).data();
    expect(request.preference).toBe('Exam Help'); expect(request.sessionTopics).toBe('Questions 4–8');
    const approved = await call({ action: 'approve', id: created.id });
    await call({ action: 'update', id: approved.id, data: { title: 'Teacher edited title' } });
    const session = (await db.collection('shifts').doc(approved.id).get()).data();
    expect(session.preference).toBe('Exam Help'); expect(session.sessionTopics).toBe('Questions 4–8');
});
test('old requests without focus can still be approved and completed, but student edits require a focus', async () => {
    const legacy = data(); delete legacy.preference;
    await db.collection('studentEventRequests').doc('legacy').set(legacy);
    await expect(call({ action: 'update', collectionName: 'studentEventRequests', id: 'legacy', data: { title: 'Edited' } }, student)).rejects.toThrow('Select a session focus');
    const approved = await call({ action: 'approve', id: 'legacy' });
    await call({ action: 'complete', id: approved.id, data: { workStatus: 'completed' } }, tutor);
    const session = (await db.collection('shifts').doc(approved.id).get()).data();
    expect(session.preference).toBeUndefined(); expect(session.workStatus).toBe('completed');
});
test.each([123, 'x'.repeat(2001)])('topics to cover rejects non-text or oversized input without saving', async sessionTopics => {
    await expect(call({ action: 'create', collectionName: 'studentEventRequests', data: data({ sessionTopics }) }, student)).rejects.toThrow('Topics to cover');
    expect((await db.collection('studentEventRequests').get()).empty).toBe(true);
});

test('Reject retains the denied request and notifies every student; Delete removes both the request and its notices', async () => {
    const peer = 'peer@kings.edu.au';
    await seed('a', { students: [{ value: student.email }, { value: peer }] });
    await call({ action: 'deny', id: 'a' });
    expect((await db.collection('studentEventRequests').doc('a').get()).data().approvalStatus).toBe('denied');
    const notices = await db.collection('bookingNotifications').get();
    expect(notices.docs.map(doc => doc.data().recipientEmail).sort()).toEqual([student.email, peer].sort());
    expect(notices.docs.every(doc => doc.data().kind === 'denied')).toBe(true);
    await db.collection('bookingNotifications').doc('unrelated').set({ eventId: 'other', kind: 'denied' });
    await call({ action: 'delete', collectionName: 'studentEventRequests', confirmPermanentDelete: true, id: 'a' });
    expect((await db.collection('studentEventRequests').doc('a').get()).exists).toBe(false);
    expect((await db.collection('bookingNotifications').get()).docs.map(doc => doc.id)).toEqual(['unrelated']);
    expect((await db.collection('shifts').get()).empty).toBe(true);
});
test('deleting a pending request does not generate a false rejection, and retry is idempotent', async () => {
    await seed('a');
    const input = { action: 'delete', collectionName: 'studentEventRequests', confirmPermanentDelete: true, id: 'a', operationId: randomUUID() };
    await call(input); await call(input);
    expect((await db.collection('studentEventRequests').doc('a').get()).exists).toBe(false);
    expect((await db.collection('bookingNotifications').get()).empty).toBe(true);
});
test.each([student, tutor])('request deletion is denied to non-managers: $defaultRole', async actor => {
    await seed('a');
    await expect(call({ action: 'delete', collectionName: 'studentEventRequests', confirmPermanentDelete: true, id: 'a' }, actor)).rejects.toMatchObject({ status: 403 });
    expect((await db.collection('studentEventRequests').doc('a').get()).exists).toBe(true);
});
test('a failed delete transaction preserves the request and its existing rejection notice', async () => {
    await seed('a'); await call({ action: 'deny', id: 'a' });
    const failing = Object.create(db); failing.runTransaction = operation => db.runTransaction(transaction => {
        const remove = transaction.delete.bind(transaction);
        transaction.delete = ref => { if (ref.parent.id === 'bookingNotifications') throw new Error('Injected delete failure'); return remove(ref); };
        return operation(transaction);
    });
    await expect(scheduleMutation(failing, teacher, { action: 'delete', collectionName: 'studentEventRequests', confirmPermanentDelete: true, id: 'a', operationId: randomUUID() }, { now: () => clock })).rejects.toThrow('Injected');
    expect((await db.collection('studentEventRequests').doc('a').get()).exists).toBe(true);
    expect((await db.collection('bookingNotifications').get()).size).toBe(1);
});
test('concurrent approval and deletion cannot leave both an approved session and a deleted decision', async () => {
    await seed('a');
    const outcomes = await Promise.allSettled([call({ action: 'approve', id: 'a' }), call({ action: 'delete', collectionName: 'studentEventRequests', confirmPermanentDelete: true, id: 'a' })]);
    expect(outcomes.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect((await db.collection('studentEventRequests').doc('a').get()).exists).toBe(false);
    const shifts = await db.collection('shifts').get(), notices = await db.collection('bookingNotifications').get();
    expect(shifts.size).toBeLessThanOrEqual(1);
    expect(notices.size).toBe(shifts.size);
    if (notices.size) expect(notices.docs[0].data().kind).toBe('approved');
});

test('an old client Delete without explicit permanent intent cannot erase or reject a request', async () => {
    await seed('a');
    await expect(call({ action: 'delete', collectionName: 'studentEventRequests', id: 'a' })).rejects.toMatchObject({ status: 409 });
    expect((await db.collection('studentEventRequests').doc('a').get()).data().approvalStatus).toBe('pending');
    expect((await db.collection('bookingNotifications').get()).empty).toBe(true);
});

// Teachers may assign several tutors; students still submit exactly one.
const secondTutor = { ...tutor, email: 'second-tutor@kings.edu.au' };
const withSecondTutor = async () => {
    await db.collection('users').doc(secondTutor.email).set(secondTutor);
    await db.collection('studentTutorEligibility').doc(student.email).set({ eligibleTutorEmails: [tutor.email, secondTutor.email] });
    return [{ value: tutor.email }, { value: secondTutor.email }];
};
test('teacher multi-tutor sessions count completed time for each assigned tutor without changing break rules', async () => {
    const staff = await withSecondTutor();
    const result = await call({ action: 'create', data: data({ staff, createdByStudent: false, end: new Date(+start + 3 * 3600000) }) });
    await call({ action: 'complete', id: result.id, data: { workStatus: 'completed' } }, secondTutor);
    const saved = (await db.collection('shifts').doc(result.id).get()).data();
    expect(saved.staffEmails).toEqual([tutor.email, secondTutor.email]);
    const { calculateHours } = require('@/lib/scheduling/hours');
    const totals = calculateHours([{ ...saved, start: saved.start.toDate(), end: saved.end.toDate() }]);
    expect(totals.paidMs / 3600000).toBe(6);
    expect(totals.tutors.map(item => item.workMs / 3600000)).toEqual([3, 3]);
});
test('teacher saves and tutor completion preserve legacy multi-tutor student assignments', async () => {
    const staff = await withSecondTutor();
    await db.collection('shifts').doc('legacy-multi').set(data({ staff, createdByStudent: false, approvalStatus: 'pending' }));
    await call({ action: 'update', id: 'legacy-multi', data: { workStatus: 'completed' } });
    await call({ action: 'complete', id: 'legacy-multi', data: { workStatus: 'notCompleted' } }, tutor);
    await call({ action: 'complete', id: 'legacy-multi', data: { workStatus: 'completed' } }, secondTutor);
    const saved = (await db.collection('shifts').doc('legacy-multi').get()).data();
    expect(saved.staff).toHaveLength(2); expect(saved.workStatus).toBe('completed');
});
test('an assigned tutor can detach and complete a multi-tutor student occurrence', async () => {
    const staff = await withSecondTutor();
    await db.collection('shifts').doc('multi-series').set(data({ staff, createdByStudent: false, approvalStatus: 'approved', recurring: 'weekly', occurenceNum: 3 }));
    const result = await call({ action: 'detach', id: 'multi-series', occurrenceIndex: 1, data: { workStatus: 'completed' } }, secondTutor);
    expect((await db.collection('shifts').doc(result.id).get()).data().staff).toHaveLength(2);
    expect((await db.collection('shifts').doc('multi-series').get()).data().eventExceptions).toEqual([1]);
});
test('student create and edit reject multiple tutors even when every tutor is eligible', async () => {
    const staff = await withSecondTutor();
    await db.collection('tutorAvailabilities').doc('free').set({ tutor: tutor.email, start, end });
    await expect(call({ action: 'create', collectionName: 'studentEventRequests', data: data({ staff }) }, student)).rejects.toThrow('one tutor');
    const request = await call({ action: 'create', collectionName: 'studentEventRequests', data: data() }, student);
    await expect(call({ action: 'update', collectionName: 'studentEventRequests', id: request.id, data: { staff } }, student)).rejects.toThrow('one tutor');
    expect((await db.collection('studentEventRequests').doc(request.id).get()).data().staff).toHaveLength(1);
});
test('teacher multi-tutor creation and approval check every tutor for every student', async () => {
    const staff = await withSecondTutor();
    await db.collection('studentTutorEligibility').doc(student.email).set({ eligibleTutorEmails: [tutor.email] });
    await expect(call({ action: 'create', data: data({ staff }) })).rejects.toThrow('not eligible');
    await seed('multi-approval');
    await expect(call({ action: 'approve', id: 'multi-approval', data: { staff } })).rejects.toThrow('not eligible');
    expect((await db.collection('studentEventRequests').doc('multi-approval').get()).exists).toBe(true);
    await db.collection('studentTutorEligibility').doc(student.email).set({ eligibleTutorEmails: [tutor.email, secondTutor.email] });
    const approved = await call({ action: 'approve', id: 'multi-approval', data: { staff } });
    expect((await db.collection('shifts').doc(approved.id).get()).data().staff).toHaveLength(2);
});
test('a conflict for the second teacher-assigned tutor blocks the booking atomically', async () => {
    const staff = await withSecondTutor();
    await db.collection('shifts').doc('second-busy').set(data({ staff: [staff[1]], createdByStudent: false, approvalStatus: 'approved' }));
    await expect(call({ action: 'create', data: data({ staff }) })).rejects.toThrow('Scheduling conflict');
    expect((await db.collection('shifts').get()).size).toBe(1);
});
test('coverage loss for a second assigned tutor produces one management notice', async () => {
    const staff = await withSecondTutor();
    for (const member of staff) await db.collection('shifts').doc(member.value).set(data({ staff: [member], students: [], createdByStudent: false, approvalStatus: 'approved' }));
    await call({ action: 'create', data: data({ staff, createdByStudent: false }) });
    await call({ action: 'delete', id: secondTutor.email });
    const notices = await db.collection('bookingNotifications').where('kind', '==', 'coverage-lost').get();
    expect(notices.size).toBe(1); expect(notices.docs[0].data().recipientEmail).toBe(teacher.email);
});
test('mixed-case timesheet templates resolve without rewriting their legacy IDs', async () => {
    const { findTimesheetTemplate } = require('@/lib/scheduling/timesheetTemplates');
    const id = 'LegacyTutor@School.Test';
    await db.collection('timesheets').doc(id).set({ fileData: 'legacy-template' });
    const found = await findTimesheetTemplate(db, id.toLowerCase());
    expect(found.id).toBe(id); expect(found.data().fileData).toBe('legacy-template');
    expect((await db.collection('timesheets').get()).size).toBe(1);
    expect(await findTimesheetTemplate(db, 'missing@school.test')).toBeNull();
});
test('ambiguous legacy template matches fail instead of choosing another uploaded file', async () => {
    const { findTimesheetTemplate } = require('@/lib/scheduling/timesheetTemplates');
    for (const id of ['LegacyTutor@School.Test', 'LEGACYTUTOR@SCHOOL.TEST']) await db.collection('timesheets').doc(id).set({ fileData: id });
    await expect(findTimesheetTemplate(db, 'legacytutor@school.test')).rejects.toThrow('Multiple timesheet templates');
});

test('a new canonical template upload takes precedence over an older mixed-case upload', async () => {
    const { findTimesheetTemplate } = require('@/lib/scheduling/timesheetTemplates');
    await db.collection('timesheets').doc('LegacyTutor@School.Test').set({ fileData: 'old-template' });
    await db.collection('timesheets').doc('legacytutor@school.test').set({ fileData: 'new-template' });
    for (const email of ['legacytutor@school.test', 'LegacyTutor@School.Test']) {
        const found = await findTimesheetTemplate(db, email);
        expect(found.id).toBe('legacytutor@school.test'); expect(found.data().fileData).toBe('new-template');
    }
});
