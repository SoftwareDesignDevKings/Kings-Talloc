const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const { doc, setDoc, getDoc, collection, getDocs, Timestamp } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');
const { addWeeks } = require('date-fns');
let mockQueryBarrier;
jest.mock('firebase/firestore', () => {
    const actual = jest.requireActual('firebase/firestore');
    return { ...actual, getDocsFromServer: async (...args) => {
        const result = await actual.getDocsFromServer(...args);
        if (mockQueryBarrier) await mockQueryBarrier();
        return result;
    } };
});
jest.mock('@/firestore/firestoreClient', () => ({ db: {} }));
const { approveStudentRequest, resolveStudentRequest } = require('@/firestore/studentRequestApprovals');

let env;
let db;
jest.setTimeout(30000);
const start = new Date(Date.now() + 28 * 86400000);
start.setMinutes(0, 0, 0);
const end = new Date(start.getTime() + 3600000);
const data = (overrides = {}) => ({
    start: Timestamp.fromDate(start), end: Timestamp.fromDate(end), approvalStatus: 'pending',
    staff: [{ value: 'tutor@kings.edu.au', label: 'Tutor' }], students: [{ value: 'student@kings.edu.au' }],
    staffEmails: ['tutor@kings.edu.au'], studentEmails: ['student@kings.edu.au'],
    emailsList: ['tutor@kings.edu.au', 'student@kings.edu.au'], ...overrides,
});
const seed = (id, overrides) => setDoc(doc(db, 'studentEventRequests', id), data(overrides));

beforeAll(async () => {
    env = await initializeTestEnvironment({
        projectId: 'test-project-approval-transactions',
        firestore: { rules: fs.readFileSync(path.join(__dirname, '../../firebase/firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8080 },
    });
    db = env.authenticatedContext('mienna@kings.edu.au', { email: 'mienna@kings.edu.au', defaultRole: 'admin', userRoles: [] }).firestore();
});
beforeEach(async () => { mockQueryBarrier = null; await env.clearFirestore(); });
afterAll(async () => env?.cleanup());

test('future request converts atomically and duplicate attempts create exactly one shift', async () => {
    await seed('request');
    const results = await Promise.allSettled([approveStudentRequest('request', db), approveStudentRequest('request', db)]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
    expect((await getDoc(doc(db, 'studentEventRequests', 'request'))).exists()).toBe(false);
    const shifts = await getDocs(collection(db, 'shifts'));
    expect(shifts.size).toBe(1);
    expect(shifts.docs[0].data()).toMatchObject({ approvalStatus: 'approved', staffEmails: ['tutor@kings.edu.au'] });
});

test('concurrent approvals of different overlapping requests serialize by tutor and leave the loser pending', async () => {
    await seed('request-a');
    await seed('request-b');
    const teacherDb = env.authenticatedContext('teacher@kings.edu.au', {
        email: 'teacher@kings.edu.au', defaultRole: 'teacher', userRoles: [],
    }).firestore();
    // Force both approvals to read an empty schedule before either attempts its commit.
    let reads = 0;
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    mockQueryBarrier = () => { if (++reads === 4) release(); return gate; };
    const results = await Promise.allSettled([
        approveStudentRequest('request-a', db), approveStudentRequest('request-b', teacherDb),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find(result => result.status === 'rejected').reason.message).toContain('Scheduling conflict');
    expect((await getDocs(collection(db, 'shifts'))).size).toBe(1);
    const requests = await getDocs(collection(db, 'studentEventRequests'));
    expect(requests.size).toBe(1);
    expect(requests.docs[0].data().approvalStatus).toBe('pending');
});

test('concurrent nonoverlapping requests for one tutor both succeed', async () => {
    await seed('request-a');
    await seed('request-b', { start: Timestamp.fromDate(end), end: Timestamp.fromMillis(end.getTime() + 3600000) });
    const results = await Promise.allSettled([approveStudentRequest('request-a', db), approveStudentRequest('request-b', db)]);
    expect(results.every(result => result.status === 'fulfilled')).toBe(true);
    expect((await getDocs(collection(db, 'shifts'))).size).toBe(2);
});

test('calendar approval preserves explicit edits and saved creation time, with guards for every assigned tutor', async () => {
    const createdAt = Timestamp.fromMillis(Date.now() - 86400000);
    await seed('request', { createdAt });
    const later = new Date(start.getTime() + 7200000);
    const result = await approveStudentRequest('request', db, {
        title: 'Edited in calendar', start: later, end: new Date(later.getTime() + 3600000),
        staff: [{ value: 'tutor@kings.edu.au' }, { value: 'second@kings.edu.au' }],
        createdAt: Timestamp.now(),
    });
    const shift = (await getDoc(doc(db, 'shifts', result.id))).data();
    expect(shift.title).toBe('Edited in calendar');
    expect(shift.start.toMillis()).toBe(later.getTime());
    expect(shift.createdAt.toMillis()).toBe(createdAt.toMillis());
    expect((await getDocs(collection(db, 'tutorBookingGuards'))).size).toBe(2);
});

test('notification settings never grant tutors or students permission to alter booking guards', async () => {
    for (const role of ['student', 'tutor']) {
        const restricted = env.authenticatedContext(`${role}@kings.edu.au`, { email: `${role}@kings.edu.au`, defaultRole: role, userRoles: [] }).firestore();
        await global.assertFails(setDoc(doc(restricted, 'tutorBookingGuards', 'tutor'), { revision: 1 }));
    }
});

test('a future scheduling conflict leaves the request pending and creates no shift', async () => {
    await seed('request');
    await setDoc(doc(db, 'shifts', 'conflict'), data({ title: 'Already booked', recurring: null }));
    await expect(approveStudentRequest('request', db)).rejects.toThrow('Scheduling conflict');
    expect((await getDoc(doc(db, 'studentEventRequests', 'request'))).data().approvalStatus).toBe('pending');
    expect((await getDocs(collection(db, 'shifts'))).size).toBe(1);
});

test('legacy shifts without flattened staff emails still block conflicting approval', async () => {
    await seed('request');
    const legacy = data({ title: 'Legacy booking' });
    delete legacy.staffEmails;
    await setDoc(doc(db, 'shifts', 'legacy'), legacy);
    await expect(approveStudentRequest('request', db)).rejects.toThrow('Scheduling conflict');
    expect((await getDoc(doc(db, 'studentEventRequests', 'request'))).exists()).toBe(true);
});

test('recurring conflicts beyond 52 weeks are detected, including occurrences starting before the request', async () => {
    await seed('request');
    const base = new Date(addWeeks(start, -70).getTime() - 1800000);
    await setDoc(doc(db, 'shifts', 'recurring'), data({
        title: 'Weekly tutoring', recurring: 'weekly', until: null,
        start: Timestamp.fromDate(base), end: Timestamp.fromDate(new Date(base.getTime() + 3600000)),
    }));
    await expect(approveStudentRequest('request', db)).rejects.toThrow('Scheduling conflict');
    expect((await getDoc(doc(db, 'studentEventRequests', 'request'))).exists()).toBe(true);
});

test('expired and denied requests cannot be approved', async () => {
    await seed('expired', { start: Timestamp.fromMillis(Date.now() - 1000) });
    await seed('denied', { approvalStatus: 'denied' });
    await expect(approveStudentRequest('expired', db)).rejects.toThrow('already started');
    await expect(approveStudentRequest('denied', db)).rejects.toThrow('already been handled');
    expect((await getDocs(collection(db, 'shifts'))).empty).toBe(true);
});

test('a rejected shift write rolls back deletion of the request', async () => {
    const limited = await initializeTestEnvironment({
        projectId: 'test-project-approval-rollback',
        firestore: { host: '127.0.0.1', port: 8080, rules: `rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { match /studentEventRequests/{id} { allow read, write: if true; } match /tutorBookingGuards/{id} { allow read, write: if true; } match /shifts/{id} { allow read: if true; allow write: if false; } } }` },
    });
    try {
        const limitedDb = limited.authenticatedContext('admin').firestore();
        await setDoc(doc(limitedDb, 'studentEventRequests', 'request'), data());
        await global.assertFails(approveStudentRequest('request', limitedDb));
        expect((await getDoc(doc(limitedDb, 'studentEventRequests', 'request'))).data().approvalStatus).toBe('pending');
        expect((await getDocs(collection(limitedDb, 'shifts'))).empty).toBe(true);
        expect((await getDocs(collection(limitedDb, 'tutorBookingGuards'))).empty).toBe(true);
    } finally {
        await limited.cleanup();
    }
});

test('denying removes it from pending without allowing a stale approval', async () => {
    await seed('request');
    await resolveStudentRequest('request', 'deny', db);
    expect((await getDoc(doc(db, 'studentEventRequests', 'request'))).data().approvalStatus).toBe('denied');
    await expect(approveStudentRequest('request', db)).rejects.toThrow('already been handled');
});
