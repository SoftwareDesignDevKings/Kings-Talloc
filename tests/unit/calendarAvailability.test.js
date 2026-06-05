import {
    isRangeCoveredByTutorAvailability,
    calendarAvailabilitySplit,
} from '@/utils/calendarAvailability';

describe('isRangeCoveredByTutorAvailability', () => {
    const tutor = 'tutor@example.edu';

    const slot = (start, end, tutorEmail = tutor) => ({
        tutor: tutorEmail,
        start: new Date(start),
        end: new Date(end),
    });

    test('returns true when the range sits fully inside one availability block', () => {
        const availabilities = [slot('2026-05-20T09:00', '2026-05-20T17:00')];

        expect(
            isRangeCoveredByTutorAvailability(
                tutor,
                new Date('2026-05-20T10:00'),
                new Date('2026-05-20T11:00'),
                availabilities,
            ),
        ).toBe(true);
    });

    test('returns false when duplicating onto a day the tutor has no availability', () => {
        // Tutor is only available on the 20th. A request duplicated to the 21st
        // (same time, next day) must not be considered covered.
        const availabilities = [slot('2026-05-20T09:00', '2026-05-20T17:00')];

        expect(
            isRangeCoveredByTutorAvailability(
                tutor,
                new Date('2026-05-21T10:00'),
                new Date('2026-05-21T11:00'),
                availabilities,
            ),
        ).toBe(false);
    });

    test('returns false when the range extends past the availability block', () => {
        const availabilities = [slot('2026-05-20T09:00', '2026-05-20T10:30')];

        expect(
            isRangeCoveredByTutorAvailability(
                tutor,
                new Date('2026-05-20T10:00'),
                new Date('2026-05-20T11:00'),
                availabilities,
            ),
        ).toBe(false);
    });

    test('only the assigned tutor\'s availability counts', () => {
        const availabilities = [
            slot('2026-05-20T09:00', '2026-05-20T17:00', 'other@example.edu'),
        ];

        expect(
            isRangeCoveredByTutorAvailability(
                tutor,
                new Date('2026-05-20T10:00'),
                new Date('2026-05-20T11:00'),
                availabilities,
            ),
        ).toBe(false);
    });

    test('contiguous adjacent blocks fully cover a spanning range', () => {
        const availabilities = [
            slot('2026-05-20T09:00', '2026-05-20T12:00'),
            slot('2026-05-20T12:00', '2026-05-20T15:00'),
        ];

        expect(
            isRangeCoveredByTutorAvailability(
                tutor,
                new Date('2026-05-20T11:00'),
                new Date('2026-05-20T14:00'),
                availabilities,
            ),
        ).toBe(true);
    });

    test('a gap between blocks leaves the range uncovered', () => {
        const availabilities = [
            slot('2026-05-20T09:00', '2026-05-20T11:00'),
            slot('2026-05-20T13:00', '2026-05-20T17:00'),
        ];

        expect(
            isRangeCoveredByTutorAvailability(
                tutor,
                new Date('2026-05-20T10:00'),
                new Date('2026-05-20T14:00'),
                availabilities,
            ),
        ).toBe(false);
    });

    test('returns false on missing inputs', () => {
        expect(isRangeCoveredByTutorAvailability(null, new Date(), new Date(), [])).toBe(false);
        expect(isRangeCoveredByTutorAvailability(tutor, null, null, [])).toBe(false);
    });
});

describe('calendarAvailabilitySplit', () => {
    const tutor = 'tutor@example.edu';

    const availability = (start, end, id = 'real-doc-id') => ({
        id,
        tutor,
        start: new Date(start),
        end: new Date(end),
    });

    const shift = (start, end, tutorEmail = tutor) => ({
        start: new Date(start),
        end: new Date(end),
        staff: [tutorEmail],
    });

    test('keeps the real id and no originalAvailabilityId when nothing overlaps', () => {
        const result = calendarAvailabilitySplit(
            [availability('2026-05-20T09:00', '2026-05-20T17:00')],
            [shift('2026-05-21T09:00', '2026-05-21T10:00')],
        );

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('real-doc-id');
        expect(result[0]).not.toHaveProperty('originalAvailabilityId');
    });

    test('split fragments carry originalAvailabilityId pointing at the real doc', () => {
        const result = calendarAvailabilitySplit(
            [availability('2026-05-20T09:00', '2026-05-20T17:00')],
            [shift('2026-05-20T12:00', '2026-05-20T13:00')],
        );

        // The shift in the middle splits the availability into two fragments.
        expect(result.length).toBeGreaterThan(1);
        for (const fragment of result) {
            expect(fragment.id).not.toBe('real-doc-id');
            expect(fragment.originalAvailabilityId).toBe('real-doc-id');
        }
    });
});
