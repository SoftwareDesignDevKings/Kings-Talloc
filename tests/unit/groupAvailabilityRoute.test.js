jest.mock('@/lib/security/serverAuth', () => ({ getRequiredSession: jest.fn() }));
jest.mock('@/firestore/firestoreAdmin', () => ({ adminDb: { collection: jest.fn() } }));
jest.mock('@/lib/scheduling/readSchedule', () => ({ readSchedule: jest.fn(), documentEvent: doc => doc.data() }));
const { getRequiredSession } = require('@/lib/security/serverAuth');
const { adminDb } = require('@/firestore/firestoreAdmin');
const { readSchedule } = require('@/lib/scheduling/readSchedule');
const { GET } = require('@/app/api/availability/route');
if (!Response.json) Response.json = (body, init) => new Response(JSON.stringify(body), init);
const tutor = 'tutor@school.test', requester = 'student@school.test', peer = 'peer@school.test';
let eligibility, reads;
const get = students => GET({ url: `http://localhost/api/availability?start=2027-04-06T09:00:00Z&end=2027-04-06T12:00:00Z&students=${encodeURIComponent(JSON.stringify(students))}` });
beforeEach(() => {
    jest.clearAllMocks(); eligibility = { [requester]: [tutor], [peer]: [tutor] }; reads = [];
    getRequiredSession.mockResolvedValue({ session: { user: { email: requester, defaultRole: 'student' } } });
    readSchedule.mockResolvedValue([{ start: new Date('2027-04-06T09:00Z'), end: new Date('2027-04-06T12:00Z'), staff: [tutor], students: [], workType: 'work' }]);
    adminDb.collection.mockImplementation(name => {
        if (name === 'users') return { get: async () => ({ docs: [{ id: tutor, data: () => ({ email: tutor, defaultRole: 'tutor' }) }] }) };
        if (name === 'tutorAvailabilities') return { where: () => ({ get: async () => ({ docs: [] }) }) };
        if (name === 'studentTutorEligibility') return { doc: email => ({ get: async () => { reads.push(email); return { data: () => ({ eligibleTutorEmails: eligibility[email] || [] }) }; } }) };
        throw new Error(name);
    });
});
test('adds requester even if omitted and returns only tutors eligible for the entire group', async () => {
    expect((await (await get([peer])).json()).slots).toHaveLength(1);
    expect(reads.sort()).toEqual([peer, requester].sort());
    eligibility[peer] = [];
    expect((await (await get([requester, peer])).json()).slots).toEqual([]);
});
test.each([['bad/path@school.test'], Array.from({ length: 31 }, (_, i) => `peer${i}@school.test`), 'not-an-array'])('rejects invalid or oversized group %j', async group => {
    expect((await get(group)).status).toBe(400); expect(readSchedule).not.toHaveBeenCalled();
});
