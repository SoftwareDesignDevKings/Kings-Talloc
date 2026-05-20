jest.mock('server-only', () => ({}), { virtual: true });

const courseDocs = [
    {
        id: '202',
        data: () => ({
            name: 'Science Year 8',
            courseCode: 'SCI8',
            rosterSyncedAt: { toDate: () => new Date('2026-05-18T01:00:00.000Z') },
        }),
    },
    {
        id: '101',
        data: () => ({
            name: 'Mathematics Year 7',
            courseCode: 'MATH7',
            blueprintCourseId: '900',
            blueprintCourseName: 'Blueprint Mathematics',
            blueprintCourseCode: 'BP_7math',
        }),
    },
];

const enrollmentDocs = [
    {
        id: 'enrol-1',
        data: () => ({
            courseId: '101',
            userId: 'u1',
            email: 'student@kings.edu.au',
            userName: 'Student One',
            lastActivityAt: { toDate: () => new Date('2026-05-19T02:00:00.000Z') },
        }),
    },
];

const userDocs = [
    {
        id: 'u1',
        data: () => ({
            email: 'student@kings.edu.au',
            name: 'Student One',
            sortableName: 'One, Student',
            sisId: 'S1',
        }),
    },
];

const adminDb = {
    collection: jest.fn((name) => ({
        get: jest.fn(() => {
            if (name === 'canvasCourses') return Promise.resolve({ docs: courseDocs });
            if (name === 'canvasEnrollments') return Promise.resolve({ docs: enrollmentDocs });
            if (name === 'canvasUsers') return Promise.resolve({ docs: userDocs });
            return Promise.resolve({ docs: [] });
        }),
    })),
};

jest.mock('@/firestore/firestoreAdmin', () => ({ adminDb }));

const {
    listCanvasClasses,
    listCanvasCourses,
    listCanvasStudents,
} = require('@/lib/canvas/canvasReferenceData');

describe('canvasReferenceData', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('lists courses in the shape expected by coverage selectors', async () => {
        await expect(listCanvasCourses()).resolves.toEqual([
            expect.objectContaining({
                id: '101',
                name: 'Mathematics Year 7',
                courseCode: 'MATH7',
                blueprintCourseId: '900',
            }),
            expect.objectContaining({
                id: '202',
                name: 'Science Year 8',
                rosterSyncedAt: '2026-05-18T01:00:00.000Z',
            }),
        ]);
    });

    test('lists classes with roster details', async () => {
        await expect(listCanvasClasses()).resolves.toEqual([
            expect.objectContaining({
                id: '101',
                students: [
                    expect.objectContaining({
                        id: 'u1',
                        email: 'student@kings.edu.au',
                        name: 'Student One',
                        lastActivityAt: '2026-05-19T02:00:00.000Z',
                    }),
                ],
            }),
            expect.objectContaining({
                id: '202',
                students: [],
            }),
        ]);
    });

    test('lists students in the shape expected by event forms', async () => {
        await expect(listCanvasStudents()).resolves.toEqual([
            {
                id: 'u1',
                canvasUserId: 'u1',
                email: 'student@kings.edu.au',
                name: 'Student One',
                sortableName: 'One, Student',
                sisId: 'S1',
            },
        ]);
    });
});
