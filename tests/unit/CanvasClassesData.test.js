// Verify the real reference-data mapping separately from the mocked UI context.
const snapshot = (records) => ({ docs: records.map(([id, data]) => ({ id, data: () => data })) });

describe('Canvas Classes reference data', () => {
    let fetchClasses;
    let getDocs;

    beforeEach(() => {
        // Each test gets a fresh module-level reference cache.
        jest.isolateModules(() => {
            ({ fetchCacheClasses: fetchClasses } = require('@/firestore/firestoreFetch'));
            ({ getDocs } = require('firebase/firestore'));
        });
        getDocs.mockReset();
    });

    test('joins enrollments to their course and excludes orphan enrollments', async () => {
        getDocs.mockResolvedValueOnce(snapshot([
            ['123', { name: 'Mathematics', courseCode: 'MATH10' }],
            ['456', { name: 'Science', courseCode: 'SCI11' }],
        ])).mockResolvedValueOnce(snapshot([
            ['enrollment-jane', { courseId: 123, userId: 'jane', userName: 'Jane Student', email: 'jane@example.edu' }],
            ['enrollment-alex', { courseId: '123', userId: 'alex', userName: 'Alex Student', email: 'alex@example.edu' }],
            ['orphan', { courseId: 'missing', userName: 'Other Student' }],
            ['no-course', { userName: 'Unassigned Student' }],
        ]));
        const classes = await fetchClasses();
        expect(classes).toHaveLength(2);
        expect(classes[0]).toMatchObject({
            id: '123', name: 'Mathematics', courseCode: 'MATH10',
            students: [
                { enrollmentId: 'enrollment-jane', name: 'Jane Student', email: 'jane@example.edu' },
                { enrollmentId: 'enrollment-alex', name: 'Alex Student', email: 'alex@example.edu' },
            ],
        });
        expect(classes[1].students).toEqual([]);
    });

    test('falls back to enrollment email and supplies empty metadata defaults', async () => {
        getDocs.mockResolvedValueOnce(snapshot([['123', { name: 'Legacy class' }]]))
            .mockResolvedValueOnce(snapshot([
                ['student', { courseId: '123', userId: 'student', emailLower: 'student@example.edu' }],
            ]));
        const [course] = await fetchClasses();
        expect(course.courseCode).toBe('');
        expect(course.students[0]).toMatchObject({
            name: 'student@example.edu', email: 'student@example.edu', currentScore: null,
        });
    });

    test('returns an empty list for an empty Canvas cache', async () => {
        getDocs.mockResolvedValue(snapshot([]));
        await expect(fetchClasses()).resolves.toEqual([]);
    });

    test('propagates a failed reference read and allows a later retry', async () => {
        getDocs.mockRejectedValueOnce(new Error('Canvas read denied')).mockResolvedValueOnce(snapshot([]));
        await expect(fetchClasses()).rejects.toThrow('Canvas read denied');
        getDocs.mockResolvedValueOnce(snapshot([['123', { name: 'Recovered class' }]]))
            .mockResolvedValueOnce(snapshot([]));
        await expect(fetchClasses()).resolves.toEqual([expect.objectContaining({ name: 'Recovered class', students: [] })]);
    });

    test('concurrent cold loads share one read of each collection', async () => {
        getDocs.mockResolvedValue(snapshot([]));
        await Promise.all([fetchClasses(), fetchClasses()]);
        expect(getDocs).toHaveBeenCalledTimes(2);
        await fetchClasses();
        expect(getDocs).toHaveBeenCalledTimes(2);
    });
});
