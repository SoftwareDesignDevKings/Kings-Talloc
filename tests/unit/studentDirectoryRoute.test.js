jest.mock('@/lib/security/serverAuth', () => ({ getRequiredSession: jest.fn() }));
jest.mock('@/firestore/firestoreAdmin', () => ({ adminDb: { collection: jest.fn() } }));
const { getRequiredSession } = require('@/lib/security/serverAuth');
const { adminDb } = require('@/firestore/firestoreAdmin');
const { GET } = require('@/app/api/students/route');
if (!Response.json) Response.json = (body, init) => new Response(JSON.stringify(body), init);
let now = 0;
beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(now += 31000);
    getRequiredSession.mockResolvedValue({ session: { user: { email: 'student@school.test', defaultRole: 'student' } } });
});
afterEach(() => jest.restoreAllMocks());
const search = q => GET({ url: `http://localhost/api/students?q=${encodeURIComponent(q)}` });
test('requires sign-in and denies unrelated roles', async () => {
    getRequiredSession.mockResolvedValueOnce({ error: Response.json({}, { status: 401 }) });
    expect((await search('Alex')).status).toBe(401);
    getRequiredSession.mockResolvedValueOnce({ session: { user: { defaultRole: 'tutor' } } });
    expect((await search('Alex')).status).toBe(403);
    expect(adminDb.collection).not.toHaveBeenCalled();
});
test.each(['', 'a', 'x'.repeat(101)])('rejects unbounded/invalid search %s before reading the roster', async query => {
    expect((await search(query)).status).toBe(400);
    expect(adminDb.collection).not.toHaveBeenCalled();
});
test('case-insensitive name/email search returns only 20 matching names and emails', async () => {
    const docs = Array.from({ length: 25 }, (_, i) => ({ data: () => ({ email: `alex${i}@school.test`, name: `Alex ${i}`, sisId: 'private-id', currentGrade: 'A', enrollments: ['class'] }) }));
    docs.push({ data: () => ({ email: 'unrelated@school.test', name: 'Sam' }) });
    const select = jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ docs }) });
    adminDb.collection.mockReturnValue({ select });
    const response = await search('ALEX'); const { students } = await response.json();
    expect(response.status).toBe(200); expect(students).toHaveLength(20);
    expect(select).toHaveBeenCalledWith('email', 'name');
    expect(students.every(student => JSON.stringify(Object.keys(student).sort()) === JSON.stringify(['email', 'name']))).toBe(true);
    const emailMatch = await (await search('alex24@school')).json(); expect(emailMatch.students).toEqual([{ email: 'alex24@school.test', name: 'Alex 24' }]);
});
test('read failure is reported as an error, not a successful empty directory', async () => {
    adminDb.collection.mockReturnValue({ select: () => ({ get: jest.fn().mockRejectedValue(new Error('offline')) }) });
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect((await search('Alex')).status).toBe(503); log.mockRestore();
});
