import { isBefore, isAfter } from 'date-fns';

/**
 * Filters and sorts events for a specific tutor.
 */
const getTutorEvents = (events, tutorEmail) => {
    const tutorEvents = [];

    for (const event of events) {
        const isTutorMatch = event.staff?.some(staff => staff.value === tutorEmail);
        const isDeniedByStudent = event.createdByStudent && event.approvalStatus === 'denied';

        if (isTutorMatch && !isDeniedByStudent) {
            tutorEvents.push(event);
        }
		
        tutorEvents.sort(
            (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
        );
    }

    return tutorEvents;
};

/**
 * Filters a single availability by removing overlapping events, returning multiple availabilities.
 */
const filterAvailabilityWithEvents = (availability, tutorEvents) => {
    const filteredAvailabilities = [];
    let currentStart = new Date(availability.start);
    const currentEnd = new Date(availability.end);

    for (const event of tutorEvents) {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);

        if (isBefore(eventStart, currentEnd) && isAfter(eventEnd, currentStart)) {
            if (isAfter(eventStart, currentStart)) {
                filteredAvailabilities.push({
                    ...availability,
                    start: currentStart,
                    end: eventStart,
                });
            }

            // Move the start forward if the event overlaps
            if (isAfter(eventEnd, currentStart)) {
                currentStart = eventEnd;
            }
        }
    }

    // Add any remaining availability after the last event
    if (isBefore(currentStart, currentEnd)) {
        filteredAvailabilities.push({
            ...availability,
            start: currentStart,
            end: currentEnd,
        });
    }

    return filteredAvailabilities;
};

/**
 * Splits all tutor availabilities into bookable availabilities
 * by removing overlaps with scheduled events.
 */
export const splitAvailabilities = (availabilities, events) => {
    const bookableAvailabilities = [];

    for (const availability of availabilities) {
        const tutorEvents = getTutorEvents(events, availability.tutor);
        const filteredAvailabilities = filterAvailabilityWithEvents(availability, tutorEvents);
        bookableAvailabilities.push(...filteredAvailabilities);
    }

    return bookableAvailabilities;
};
