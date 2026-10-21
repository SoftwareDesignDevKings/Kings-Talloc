/** @jest-environment node */
jest.mock('server-only', () => ({}), { virtual: true });
const mockCollections = {};
const mockReads = [];
const mockSession = { current: null };
jest.mock('@/firestore/firestoreAdmin', () => ({
    adminDb: {
        collection: name => {
            const docs = () => Object.entries(mockCollections[name] || {}).map(([id, data]) => ({ id, data: () => data }));
            const query = {
                select: (...fields) => { query.fields = fields; return query; },
                where: () => query,
                get: async () => { mockReads.push({ name, fields: query.fields }); return { docs: docs() }; },
                doc: id => ({ get: async () => { mockReads.push({ name, id }); return { data: () => mockCollections[name]?.[id] }; } }),
            };
            return query;
        },
    },
}));
jest.mock('@/lib/security/serverAuth', () => ({
    getRequiredSession: async () => mockSession.current ? { session: mockSession.current } : { error: Response.json({}, { status: 401 }) },
    getRequiredAdminOrTeacherSession: async () => {
        const roles = [mockSession.current?.user.defaultRole, ...(mockSession.current?.user.userRoles || [])];
        if (!mockSession.current) return { error: Response.json({}, { status: 401 }) };
        return roles.some(role => ['admin', 'teacher'].includes(role)) ? { session: mockSession.current } : { error: Response.json({}, { status: 403 }) };
    },
}));

const { readClassDirectory, readStudentDirectory, readStudentEligibility } = require('@/lib/canvas/canvasReference');
const { GET: classesRoute } = require('@/app/api/reference/classes/route');
const { GET: eligibilityRoute } = require('@/app/api/reference/eligibility/route');

beforeEach(() => {
    mockReads.length = 0;
    for (const key of Object.keys(mockCollections)) delete mockCollections[key];
});

test('joins rosters to courses without grades or activity data', async () => {
    mockCollections.canvasCourses = { 123: { name: 'Mathematics', courseCode: 'MATH10' }, 456: { name: 'Science' } };
    mockCollections.canvasEnrollments = {
        'enrollment-jane': { courseId: 123, userId: 'jane', userName: 'Jane Student', email: 'jane@example.edu', currentScore: 91, currentGrade: 'A' },
        'enrollment-legacy': { courseId: '123', userId: 'legacy', emailLower: 'legacy@example.edu' },
        orphan: { courseId: 'missing', userName: 'Other Student' },
        'no-course': { userName: 'Unassigned Student' },
    };
    const classes = await readClassDirectory();
    expect(classes).toHaveLength(2);
    expect(classes[0]).toMatchObject({ id: '123', name: 'Mathematics', courseCode: 'MATH10' });
    expect(classes[0].students).toEqual([
        { id: 'jane', canvasUserId: 'jane', enrollmentId: 'enrollment-jane', email: 'jane@example.edu', name: 'Jane Student', sortableName: '' },
        { id: 'legacy', canvasUserId: 'legacy', enrollmentId: 'enrollment-legacy', email: 'legacy@example.edu', name: 'legacy@example.edu', sortableName: '' },
    ]);
    expect(classes[1]).toMatchObject({ id: '456', courseCode: '', students: [] });
    expect(JSON.stringify(classes)).not.toMatch(/currentScore|currentGrade/);
    expect(mockReads.find(read => read.name === 'canvasEnrollments').fields).not.toContain('currentScore');
});

test('the student directory is de-duplicated, lowercased and sorted', async () => {
    mockCollections.canvasUsers = { 1: { email: 'Zed@School.test', name: 'Zed' }, 2: { email: 'zed@school.test', name: 'Zed' }, 3: { email: 'amy@school.test' }, 4: { name: 'No email' } };
    expect(await readStudentDirectory()).toEqual([{ email: 'amy@school.test', name: 'amy@school.test' }, { email: 'zed@school.test', name: 'Zed' }]);
});

test('eligibility reads one document and defaults when missing', async () => {
    mockCollections.studentTutorEligibility = { 'amy@school.test': { eligibleTutorEmails: ['tutor@school.test'] } };
    expect(await readStudentEligibility('Amy@School.test')).toEqual({ coverageKeys: [], eligibleTutorEmails: ['tutor@school.test'], eligibleTutors: [] });
    expect(await readStudentEligibility('new@school.test')).toEqual({ coverageKeys: [], eligibleTutorEmails: [], eligibleTutors: [] });
    expect(await readStudentEligibility('bad/id')).toEqual({ coverageKeys: [], eligibleTutorEmails: [], eligibleTutors: [] });
    expect(mockReads.map(read => read.id)).toEqual(['amy@school.test', 'new@school.test']);
});

test('class rosters are only served to teachers and admins', async () => {
    mockCollections.canvasCourses = {}; mockCollections.canvasEnrollments = {};
    mockSession.current = { user: { email: 'student@school.test', defaultRole: 'student' } };
    expect((await classesRoute()).status).toBe(403);
    mockSession.current = { user: { email: 'teacher@school.test', defaultRole: 'teacher' } };
    const response = await classesRoute();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ classes: [] });
});

test('students only receive their own eligibility', async () => {
    mockCollections.studentTutorEligibility = { 'amy@school.test': { eligibleTutorEmails: ['tutor@school.test'] }, 'bob@school.test': { eligibleTutorEmails: ['other@school.test'] } };
    mockSession.current = { user: { email: 'amy@school.test', defaultRole: 'student' } };
    expect((await (await eligibilityRoute()).json()).eligibility.eligibleTutorEmails).toEqual(['tutor@school.test']);
});

test('the tutor directory merges role queries, skips disabled accounts and keeps roles', async () => {
    const { readTutorDirectory } = require('@/lib/scheduling/tutorDirectory');
    mockCollections.users = {
        a: { email: 'tutor@school.test', name: 'Tutor', defaultRole: 'tutor', userRoles: ['coach'] },
        b: { email: 'legacy@school.test', name: 'Legacy', role: 'coach' },
        c: { email: 'gone@school.test', name: 'Gone', defaultRole: 'tutor', disabled: true },
    };
    expect(await readTutorDirectory()).toEqual([
        { email: 'tutor@school.test', name: 'Tutor', roles: ['tutor', 'coach'] },
        { email: 'legacy@school.test', name: 'Legacy', roles: ['coach'] },
    ]);
});
