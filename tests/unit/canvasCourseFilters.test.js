import {
    courseTermOverlapsYear,
    filterCoursesByCurrentYearTerm,
} from '@/lib/canvas/canvasCourseFilters';

describe('Canvas course term filters', () => {
    test('includes terms that overlap the selected calendar year', () => {
        expect(courseTermOverlapsYear({
            term: {
                start_at: '2025-10-01T00:00:00Z',
                end_at: '2026-02-01T00:00:00Z',
            },
        }, 2026)).toBe(true);

        expect(courseTermOverlapsYear({
            term: {
                start_at: '2026-10-01T00:00:00Z',
                end_at: '2027-02-01T00:00:00Z',
            },
        }, 2026)).toBe(true);
    });

    test('excludes terms outside the selected calendar year', () => {
        const filtered = filterCoursesByCurrentYearTerm([
            {
                id: 1,
                term: {
                    start_at: '2026-01-01T00:00:00Z',
                    end_at: '2026-12-31T23:59:59Z',
                },
            },
            {
                id: 2,
                term: {
                    start_at: '2025-01-01T00:00:00Z',
                    end_at: '2025-12-31T23:59:59Z',
                },
            },
            {
                id: 3,
                term: {
                    start_at: '2027-01-01T00:00:00Z',
                    end_at: '2027-12-31T23:59:59Z',
                },
            },
        ], 2026);

        expect(filtered.map((course) => course.id)).toEqual([1]);
    });

    test('treats one missing term boundary as open-ended but excludes undated terms', () => {
        expect(courseTermOverlapsYear({
            term: { start_at: null, end_at: '2026-03-01T00:00:00Z' },
        }, 2026)).toBe(true);
        expect(courseTermOverlapsYear({
            term: { start_at: '2026-03-01T00:00:00Z', end_at: null },
        }, 2026)).toBe(true);
        expect(courseTermOverlapsYear({
            term: { start_at: null, end_at: null },
        }, 2026)).toBe(false);
        expect(courseTermOverlapsYear({}, 2026)).toBe(false);
    });
});
