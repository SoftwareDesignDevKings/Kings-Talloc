/** @jest-environment node */
const mockDocuments = new Map(), mockAuthUsers = new Map();
const mockDeletedField = Symbol('deleted');
let mockSession, mockFailReads = false;
const mockQueries = [];
const mockToken = jest.fn(), mockRevoke = jest.fn(), mockRebuild = jest.fn();
const mockWrite = (ref, data, merge = false) => {
    const next = merge ? { ...mockDocuments.get(ref.path), ...data } : { ...data };
    Object.keys(next).forEach(key => { if (next[key] === mockDeletedField) delete next[key]; });
    mockDocuments.set(ref.path, next);
};
const mockReference = (collection, id) => {
    const ref = { id, path: `${collection}/${id}` };
    ref.get = async () => {
        if (mockFailReads) throw new Error('Database unavailable');
        return { id, ref, exists: mockDocuments.has(ref.path), data: () => mockDocuments.get(ref.path) };
    };
    ref.update = async data => mockWrite(ref, data, true);
    return ref;
};
jest.mock('server-only', () => ({}), { virtual: true });
jest.mock('firebase-admin/firestore', () => ({ FieldPath: { documentId: () => '__name__' }, FieldValue: { delete: () => mockDeletedField, serverTimestamp: () => new Date() } }));
jest.mock('next-auth/next', () => ({ getServerSession: async () => mockSession }));
jest.mock('@/lib/canvas/tutorEligibility', () => ({ rebuildStudentTutorEligibility: mockRebuild }));
jest.mock('@/firestore/firestoreAdmin', () => ({
    adminDb: {
        collection: collection => {
            let first = '', last = '￿', count = Infinity, fields = null;
            const filters = [];
            const query = {
                doc: id => mockReference(collection, id),
                where: (field, op, value) => { filters.push({ field, op, value }); return query; },
                orderBy: () => query, select: (...selected) => { fields = selected; return query; }, startAt: value => { first = value; return query; },
                endAt: value => { last = value; return query; }, limit: value => { count = value; return query; },
                get: async () => {
                    if (mockFailReads) throw new Error('Database unavailable');
                    const ids = [...mockDocuments.keys()].filter(key => key.startsWith(`${collection}/`)).map(key => key.slice(collection.length + 1))
                        .filter(id => id >= first && id <= last).sort().slice(0, count);
                    const read = (await Promise.all(ids.map(id => mockReference(collection, id).get())))
                        .filter(doc => filters.every(({ field, op, value }) => op === 'array-contains-any' && (doc.data()[field] || []).some(item => value.includes(item))));
                    mockQueries.push({ collection, filters: [...filters], ids: read.map(doc => doc.id) });
                    // Like Firestore, select() returns only the requested fields.
                    const docs = fields ? read.map(doc => ({ ...doc, data: () => Object.fromEntries(fields.filter(field => field in doc.data()).map(field => [field, doc.data()[field]])) })) : read;
                    return { docs, size: docs.length, forEach: callback => docs.forEach(callback) };
                },
            };
            return query;
        },
        runTransaction: async callback => callback({
            get: ref => ref.get(), set: (ref, data, options) => mockWrite(ref, data, options?.merge),
            create: (ref, data) => mockWrite(ref, data), delete: ref => mockDocuments.delete(ref.path),
        }),
        batch: () => {
            const writes = [];
            return { set: (ref, data) => writes.push(() => mockWrite(ref, data)), delete: ref => writes.push(() => mockDocuments.delete(ref.path)), commit: async () => writes.forEach(write => write()) };
        },
    },
    adminDbAuth: {
        getUser: async uid => { if (!mockAuthUsers.has(uid)) throw Object.assign(new Error('Missing account'), { code: 'auth/user-not-found' }); return mockAuthUsers.get(uid); },
        getUserByEmail: async email => { const user = mockAuthUsers.get(email.toLowerCase()); if (!user) throw Object.assign(new Error('Missing account'), { code: 'auth/user-not-found' }); return user; },
        createUser: async data => { mockAuthUsers.set(data.uid, data); return data; },
        updateUser: async (uid, data) => { mockAuthUsers.set(uid, { ...mockAuthUsers.get(uid), ...data }); },
        deleteUser: async uid => mockAuthUsers.delete(uid), revokeRefreshTokens: mockRevoke, createCustomToken: mockToken,
    },
}));
const { authOptions } = require('@/lib/security/authConfig');
const { getCurrentAccount } = require('@/lib/security/accountState');
const { getRequiredSession, getRequiredAdminSession } = require('@/lib/security/serverAuth');
const { GET: listAccounts, POST: saveAccount, DELETE: deleteAccount } = require('@/app/api/users/route');
const { GET: calendarLink } = require('@/app/api/calendar/route');
const { GET: calendarFeed } = require('@/app/api/calendar/feed/route');
const admin = 'admin@school.test', student = 'student@school.test';
const profile = (email, defaultRole, authVersion = '') => ({ email, name: email, defaultRole, userRoles: [], authVersion });
const request = body => new Request('http://localhost/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'http://localhost' }, body: JSON.stringify(body) });
const edit = (email, extra = {}) => ({ mode: 'update', email, name: 'Updated name', defaultRole: 'student', userRoles: [], ...extra });
beforeEach(() => {
    jest.clearAllMocks(); mockDocuments.clear(); mockAuthUsers.clear(); mockFailReads = false;
    for (const [email, role] of [[admin, 'admin'], [student, 'student']]) {
        mockDocuments.set(`users/${email}`, profile(email, role));
        mockAuthUsers.set(email, { uid: email, email, disabled: false });
    }
    mockSession = { user: { email: admin, defaultRole: 'admin', userRoles: [], authVersion: '' } };
    mockToken.mockResolvedValue('fresh-test-token'); mockRevoke.mockResolvedValue(); mockRebuild.mockResolvedValue({});
});
test('first sign-in creates a server-owned student profile regardless of supplied roles', async () => {
    const user = { email: 'new@school.test', name: 'New student', defaultRole: 'admin', userRolesList: ['admin'] };
    expect(await authOptions.callbacks.signIn({ user })).toBe(true);
    expect(mockDocuments.get(`users/${user.email}`)).toMatchObject({ defaultRole: 'student', userRoles: [] });
    expect(user.defaultRole).toBe('student'); expect(user.userRolesList).toEqual([]);
    expect(user.authVersion).toBeTruthy();
});
test('legacy profiles keep their real roles while obsolete public calendar keys are removed', async () => {
    mockDocuments.set(`users/${admin}`, { ...profile(admin, 'teacher'), userRoles: ['admin'], calendarFeedToken: 'legacy-exposed' });
    const user = { email: admin };
    expect(await authOptions.callbacks.signIn({ user })).toBe(true);
    expect(user.defaultRole).toBe('teacher'); expect(user.userRolesList).toEqual(['admin']);
    expect(mockDocuments.get(`users/${admin}`).calendarFeedToken).toBeUndefined();
});
test('refreshing an old admin token reissues only the current student permissions', async () => {
    mockDocuments.set(`users/${admin}`, profile(admin, 'student'));
    const token = await authOptions.callbacks.jwt({ token: { email: admin, defaultRole: 'admin', userRoles: ['teacher'], calendarFeedToken: 'legacy-exposed' } });
    expect(token.defaultRole).toBe('student'); expect(token.userRoles).toEqual([]);
    expect(token.calendarFeedToken).toBeUndefined();
    expect(mockToken).toHaveBeenCalledWith(admin, expect.objectContaining({ defaultRole: 'student', userRoles: [] }));
    expect((await getRequiredAdminSession()).error.status).toBe(403);
});
test.each(['deleted', 'disabled-profile', 'disabled-auth', 'revoked', 'version-mismatch'])('%s blocks token refresh and API access despite an old admin cookie', async state => {
    if (state === 'deleted') mockDocuments.delete(`users/${admin}`);
    if (state === 'disabled-profile') mockDocuments.get(`users/${admin}`).disabled = true;
    if (state === 'disabled-auth') mockAuthUsers.get(admin).disabled = true;
    if (state === 'revoked') mockDocuments.set(`revokedAccounts/${admin}`, {});
    if (state === 'version-mismatch') mockDocuments.get(`users/${admin}`).authVersion = 'new-version';
    const token = await authOptions.callbacks.jwt({ token: { email: admin, defaultRole: 'admin', firebaseToken: 'stale' } });
    expect(token.accountValid).toBe(false); expect(token.firebaseToken).toBeUndefined(); expect(mockToken).not.toHaveBeenCalled();
    expect((await authOptions.callbacks.session({ session: { user: { email: admin } }, token })).user).toBeNull();
    expect((await getRequiredSession()).error.status).toBe(401);
});
test('live secondary roles are retained without trusting stale claims', async () => {
    mockDocuments.set(`users/${student}`, { ...profile(student, 'tutor'), userRoles: ['admin'] });
    mockSession.user = { email: student, defaultRole: 'student', userRoles: [] };
    expect((await getRequiredAdminSession()).session.user.userRoles).toEqual(['admin']);
});
test('unavailable account checks fail closed', async () => {
    mockFailReads = true;
    expect((await getRequiredSession()).error.status).toBe(503);
    const token = await authOptions.callbacks.jwt({ token: { email: admin, defaultRole: 'admin', msRefreshToken: 'dummy-ms-refresh' } });
    expect(token.accountValid).toBe(false);
    expect(token.msRefreshToken).toBe('dummy-ms-refresh');
    expect(mockToken).not.toHaveBeenCalled();
});
test('students cannot use the server account-management endpoint', async () => {
    mockSession.user = { email: student, defaultRole: 'admin', userRoles: [] };
    expect((await saveAccount(request(edit(student, { defaultRole: 'admin' })))).status).toBe(403);
    expect((await deleteAccount(request({ email: admin }))).status).toBe(403);
    expect(mockDocuments.get(`users/${student}`).defaultRole).toBe('student');
});
test('admin role changes invalidate previous sessions and calendar links', async () => {
    mockDocuments.set(`calendarFeedSecrets/${student}`, { token: 'old', authVersion: '' });
    expect((await saveAccount(request(edit(student, { defaultRole: 'tutor' })))).status).toBe(200);
    const saved = mockDocuments.get(`users/${student}`);
    expect(saved.defaultRole).toBe('tutor'); expect(saved.authVersion).toBeTruthy();
    expect(mockDocuments.has(`calendarFeedSecrets/${student}`)).toBe(false);
    expect(await getCurrentAccount(student, '')).toBeNull();
    expect(mockRevoke).toHaveBeenCalledWith(student);
});
test('ordinary profile edits do not unnecessarily sign users out', async () => {
    expect((await saveAccount(request(edit(student)))).status).toBe(200);
    expect(mockDocuments.get(`users/${student}`).authVersion).toBe('');
    expect(mockRevoke).not.toHaveBeenCalled();
});
test('account deletion blocks existing sessions and OAuth reprovisioning, even if Firebase cleanup fails', async () => {
    mockRevoke.mockRejectedValueOnce(new Error('Auth cleanup unavailable'));
    const response = await deleteAccount(request({ email: student }));
    expect(response.status).toBe(200); expect((await response.json()).warning).toBeTruthy();
    expect(mockDocuments.has(`users/${student}`)).toBe(false); expect(mockDocuments.has(`revokedAccounts/${student}`)).toBe(true);
    expect(await authOptions.callbacks.signIn({ user: { email: student } })).toBe(false);
    expect(await getCurrentAccount(student, '')).toBeNull();
});
test('only explicit admin recreation clears revocation; old cookies stay invalid', async () => {
    await deleteAccount(request({ email: student }));
    expect((await saveAccount(request(edit(student, { mode: 'create' })))).status).toBe(200);
    expect(mockDocuments.has(`revokedAccounts/${student}`)).toBe(false);
    expect(mockDocuments.get(`users/${student}`).authVersion).toBeTruthy();
    const user = { email: student };
    expect(await authOptions.callbacks.signIn({ user })).toBe(true);
    expect(await getCurrentAccount(student, '')).toBeNull();
    expect(await getCurrentAccount(student, user.authVersion)).not.toBeNull();
});
test('calendar links store only a new private key, reuse it safely and reject exposed legacy keys', async () => {
    mockSession.user = { email: student, defaultRole: 'student', userRoles: [] };
    const legacy = 'a'.repeat(64);
    mockDocuments.get(`users/${student}`).calendarFeedToken = legacy;
    expect((await calendarFeed(new Request(`http://localhost/api/calendar/feed?uid=${student}&token=${legacy}`))).status).toBe(401);
    const response = await calendarLink(); expect(response.headers.get('cache-control')).toBe('no-store');
    const { httpsUrl } = await response.json(); const token = new URL(httpsUrl).searchParams.get('token');
    expect(token).toMatch(/^[a-f0-9]{64}$/); expect(token).not.toBe(legacy);
    expect(mockDocuments.get(`calendarFeedSecrets/${student}`).token).toBe(token);
    expect((await (await calendarLink()).json()).httpsUrl).toBe(httpsUrl);
    expect((await calendarFeed(new Request(httpsUrl))).status).toBe(200);
    mockDocuments.get(`users/${student}`).authVersion = 'changed';
    expect((await calendarFeed(new Request(httpsUrl))).status).toBe(401);
});
test('calendar feeds read only the subscriber\'s shifts', async () => {
    mockSession.user = { email: student, defaultRole: 'student', userRoles: [] };
    const { httpsUrl } = await (await calendarLink()).json();
    const shift = (title, emailsList) => ({ title, start: new Date('2027-04-06T05:00Z'), end: new Date('2027-04-06T06:00Z'), staff: emailsList, students: [], emailsList });
    mockDocuments.set('shifts/mine', shift('Mine', [student]));
    mockDocuments.set('shifts/other', shift('Other', ['tutor@school.test']));
    mockQueries.length = 0;
    const body = await (await calendarFeed(new Request(httpsUrl))).text();
    expect(body).toContain('SUMMARY:Mine'); expect(body).not.toContain('SUMMARY:Other');
    const shiftReads = mockQueries.filter(query => query.collection === 'shifts');
    expect(shiftReads).toEqual([{ collection: 'shifts', filters: [{ field: 'emailsList', op: 'array-contains-any', value: [student] }], ids: ['mine'] }]);
});
test('session responses never contain old calendar credentials', async () => {
    const token = await authOptions.callbacks.jwt({ token: { email: student, calendarFeedToken: 'legacy' } });
    const session = await authOptions.callbacks.session({ session: { user: { email: student, calendarFeedToken: 'legacy' } }, token });
    expect(session.user.calendarFeedToken).toBeUndefined(); expect(session.user.firebaseToken).toBe('fresh-test-token');
});


test('case variations in Microsoft email find the existing profile without creating a duplicate or losing roles', async () => {
    mockDocuments.set(`users/${student}`, { ...profile(student, 'tutor'), userRoles: ['coach'] });
    const user = { email: student.toUpperCase() };
    expect(await authOptions.callbacks.signIn({ user })).toBe(true);
    expect(user.email).toBe(student); expect(user.userRolesList).toEqual(['coach']);
    expect([...mockDocuments.keys()].filter(key => key.startsWith('users/'))).toHaveLength(2);
});
test('a legacy mixed-case profile is resolved from a lower-case login and scheduling lookup without rekeying it', async () => {
    const legacy = 'StuDent@School.Test';
    mockDocuments.delete(`users/${student}`); mockDocuments.set(`users/${legacy}`, profile(legacy, 'tutor'));
    const user = { email: student };
    expect(await authOptions.callbacks.signIn({ user })).toBe(true);
    expect(user.email).toBe(legacy); expect(user.profileId).toBe(legacy); expect(user.defaultRole).toBe('tutor');
    const token = await authOptions.callbacks.jwt({ token: { email: student } });
    expect(token.profileId).toBe(legacy);
    expect(mockToken).toHaveBeenCalledWith(student, expect.objectContaining({ profileId: legacy }));
    expect(mockDocuments.has(`users/${student}`)).toBe(false);
});
test('new mixed-case Microsoft sign-ins create a canonical profile ID and Firebase UID', async () => {
    const user = { email: 'New.Person@School.Test' };
    expect(await authOptions.callbacks.signIn({ user })).toBe(true);
    expect(user.email).toBe('new.person@school.test'); expect(mockAuthUsers.has(user.email)).toBe(true);
    expect(mockDocuments.has('users/New.Person@School.Test')).toBe(false);
});
test('ambiguous legacy spellings fail closed rather than choosing a privileged profile', async () => {
    mockDocuments.delete(`users/${student}`);
    for (const id of ['StuDent@School.Test', 'Student@School.Test']) mockDocuments.set(`users/${id}`, profile(id, 'admin'));
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(await authOptions.callbacks.signIn({ user: { email: student } })).toBe(false);
    expect(mockDocuments.has(`users/${student}`)).toBe(false); error.mockRestore();
});
test('only admins can list accounts, and the list never includes auth versions', async () => {
    mockDocuments.set(`users/${student}`, { ...profile(student, 'student', 'secret-version'), tutorCoverageKeys: [] });
    const response = await listAccounts();
    expect(response.status).toBe(200);
    const { users } = await response.json();
    expect(users.map(user => user.id).sort()).toEqual([admin, student].sort());
    expect(JSON.stringify(users)).not.toContain('secret-version');
    expect(users.find(user => user.id === student)).toEqual({ id: student, email: student, name: student, defaultRole: 'student', userRoles: [], tutorCoverageKeys: [] });
    mockSession.user = { email: student, defaultRole: 'student', userRoles: [], authVersion: 'secret-version' };
    expect((await listAccounts()).status).toBe(403);
});
