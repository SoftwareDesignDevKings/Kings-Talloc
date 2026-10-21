/** @jest-environment node */
jest.mock('server-only', () => ({}), { virtual: true });

describe('server read logging', () => {
    // Fresh classes per test, since enabling logging patches their prototypes.
    let Query, Firestore, Transaction;
    const makeClasses = () => {
        Query = class { constructor(collectionId, size) { this._queryOptions = { collectionId }; this.size = size; } async get() { return { size: this.size }; } };
        Firestore = class { async getAll(...refs) { return refs.map(() => ({})); } };
        Transaction = class { async get(refOrQuery) { return refOrQuery instanceof Query ? { size: refOrQuery.size } : {}; } async getAll(...refs) { return refs; } };
    };
    const ref = (collection, id) => ({ id, parent: { id: collection } });
    let logs, env;

    beforeEach(() => {
        env = process.env.NODE_ENV;
        logs = [];
        jest.spyOn(console, 'log').mockImplementation(line => logs.push(line));
        delete globalThis[Symbol.for('talloc.firestoreReadLogging')];
        jest.resetModules();
        makeClasses();
        jest.doMock('firebase-admin/firestore', () => ({ Query, Firestore, Transaction }));
        jest.doMock('next/headers', () => ({ headers: async () => new Map([['x-matched-path', '/api/availability']]) }));
    });
    afterEach(() => { process.env.NODE_ENV = env; delete process.env.FIRESTORE_READ_LOGGING; jest.restoreAllMocks(); });

    const flushLogs = () => new Promise(resolve => setTimeout(resolve, 0));

    test('logs billed reads with collection, operation and route', async () => {
        process.env.NODE_ENV = 'production';
        require('@/lib/telemetry/firestoreReadLog').enableFirestoreReadLogging();
        await new Query('shifts', 12).get();
        await new Query('users', 0).get();
        await new Firestore().getAll(ref('users', 'a'), ref('users', 'b'), ref('revokedAccounts', 'a'));
        await new Transaction().get(new Query('tutorAvailabilities', 3));
        await new Transaction().get(ref('schedulingOperations', 'op'));
        await flushLogs();
        expect(logs).toEqual([
            '[firestore-reads] source=server reads=12 collection=shifts op=query route=/api/availability',
            '[firestore-reads] source=server reads=1 collection=users op=query route=/api/availability',
            '[firestore-reads] source=server reads=2 collection=users op=doc route=/api/availability',
            '[firestore-reads] source=server reads=1 collection=revokedAccounts op=doc route=/api/availability',
            '[firestore-reads] source=server reads=3 collection=tutorAvailabilities op=transaction-query route=/api/availability',
            '[firestore-reads] source=server reads=1 collection=schedulingOperations op=transaction-doc route=/api/availability',
        ]);
    });

    test('is off in tests and when disabled by environment variable', async () => {
        process.env.NODE_ENV = 'production';
        process.env.FIRESTORE_READ_LOGGING = 'off';
        require('@/lib/telemetry/firestoreReadLog').enableFirestoreReadLogging();
        await new Query('shifts', 5).get();
        await flushLogs();
        expect(logs).toEqual([]);
    });
});

describe('browser read report endpoint', () => {
    let token, logs;
    beforeEach(() => {
        jest.resetModules();
        logs = [];
        jest.spyOn(console, 'log').mockImplementation(line => logs.push(line));
        jest.doMock('next-auth/jwt', () => ({ getToken: async () => token }));
    });
    afterEach(() => jest.restoreAllMocks());
    const post = (body, site = 'same-origin') => require('@/app/api/telemetry/reads/route').POST(new Request('http://localhost/api/telemetry/reads', { method: 'POST', headers: { 'sec-fetch-site': site }, body: JSON.stringify(body) }));

    test('logs a signed-in report with totals and the largest sources first', async () => {
        token = { email: 'teacher@school.test', defaultRole: 'teacher' };
        expect((await post({ path: '/calendar', reads: { 'shifts:one-off': 4, tutorAvailabilities: 30, bad: -2, alsoBad: 'x' } })).status).toBe(204);
        expect(logs).toEqual(['[firestore-reads] source=browser reads=34 user=teacher@school.test role=teacher path=/calendar detail=tutorAvailabilities:30,shifts:one-off:4']);
    });

    test('still logs reports when the session cookie cannot be read', async () => {
        token = null;
        await post({ path: '/calendar', reads: { shifts: 3 } });
        expect(logs).toEqual(['[firestore-reads] source=browser reads=3 user=unknown role=unknown path=/calendar detail=shifts:3']);
    });

    test('rejects reports from other sites, without reads or with bad bodies, and says why', async () => {
        const warnings = []; jest.spyOn(console, 'warn').mockImplementation(line => warnings.push(line));
        token = { email: 'teacher@school.test' };
        await post({ path: '/calendar', reads: { shifts: 3 } }, 'cross-site');
        await post({ path: '/calendar', reads: {} });
        await require('@/app/api/telemetry/reads/route').POST(new Request('http://localhost/api/telemetry/reads', { method: 'POST', headers: { 'sec-fetch-site': 'same-origin' }, body: '' }));
        await require('@/app/api/telemetry/reads/route').POST(new Request('http://localhost/api/telemetry/reads', { method: 'POST', headers: { 'sec-fetch-site': 'same-origin' }, body: 'not json' }));
        expect(logs).toEqual([]);
        expect(warnings).toEqual([
            '[firestore-reads] source=browser rejected reason=site-cross-site',
            '[firestore-reads] source=browser rejected reason=no-reads',
            '[firestore-reads] source=browser rejected reason=empty-body',
            '[firestore-reads] source=browser rejected reason=invalid-SyntaxError',
        ]);
    });
});
