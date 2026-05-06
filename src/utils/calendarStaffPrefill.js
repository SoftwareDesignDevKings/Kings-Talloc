/**
 * Builds EventForm staff option objects from the calendar tutor filter (react-select tags),
 * matching shape and availability logic from useEventFormData.
 *
 * @param {Array<{ value: string, label?: string }>|null|undefined} filterByTutor
 * @param {Array<{ email: string, name?: string, roles?: string[] }>} tutors
 * @param {Array<{ tutor: string, start: unknown, end: unknown, locationType?: string }>} calendarAvailabilities
 * @param {Date|string|number} start
 * @param {Date|string|number} end
 * @param {string} [workType='work']
 * @returns {Array<{ value: string, label: string, roles?: string[], locationType: string }>}
 */
export function buildPrefilledStaffFromTutorFilter(
    filterByTutor,
    tutors,
    calendarAvailabilities,
    start,
    end,
    workType = 'work',
) {
    if (!filterByTutor?.length) return [];

    const eventStart = new Date(start);
    const eventEnd = new Date(end);
    const tutorByEmail = new Map((tutors || []).map((t) => [t.email, t]));

    const result = [];
    for (const opt of filterByTutor) {
        const email = opt.value;
        const tutor = tutorByEmail.get(email);
        if (workType === 'tutoring' && tutor && !tutor.roles?.includes('tutor')) continue;
        if (workType === 'coaching' && tutor && !tutor.roles?.includes('coach')) continue;

        const matchingAvailability = (calendarAvailabilities || []).find(
            (avail) =>
                avail.tutor === email &&
                new Date(avail.start) <= eventStart &&
                new Date(avail.end) >= eventEnd,
        );

        result.push({
            value: email,
            label: tutor?.name ?? opt.label ?? email,
            roles: tutor?.roles,
            locationType: matchingAvailability
                ? matchingAvailability.locationType || 'onsite'
                : 'unavailable',
        });
    }
    return result;
}
