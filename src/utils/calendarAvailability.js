// import { isBefore, isAfter } from 'date-fns';

/**
 * Split availabilities around booked events
 */
export const calendarAvailabilitySplit = (availabilities, events) => {
    if (!availabilities.length || !events.length) {
        return availabilities;
    }

    const splitSlots = [];

    // Pre-filter and sort all events once
    const validEvents = events.filter(
        (event) => !event.createdByStudent || event.approvalStatus !== 'denied',
    );

    // Group events by tutor for faster lookup
    const eventsByTutor = new Map();
    for (const event of validEvents) {
        // Only process events that have staff (shifts)
        if (!event.staff || !Array.isArray(event.staff)) continue;

        for (const staff of event.staff) {
            const tutorEmail = staff.value || staff;
            if (!eventsByTutor.has(tutorEmail)) {
                eventsByTutor.set(tutorEmail, []);
            }
            eventsByTutor.get(tutorEmail).push(event);
        }
    }

    // Sort events by tutor once
    for (const [tutor, tutorEvents] of eventsByTutor.entries()) {
        tutorEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
    }

    for (const availability of availabilities) {
        const currentStart = new Date(availability.start);
        const currentEnd = new Date(availability.end);
        const tutorEvents = eventsByTutor.get(availability.tutor) || [];

        let slotStart = currentStart;
        let wasSplit = false;

        for (const event of tutorEvents) {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);

            // Skip events that don't overlap
            if (eventStart >= currentEnd || eventEnd <= slotStart) continue;

            // Add slot before event if there's a gap
            if (eventStart > slotStart) {
                splitSlots.push({
                    ...availability,
                    id: crypto.randomUUID(),
                    originalAvailabilityId: availability.id,
                    start: slotStart,
                    end: eventStart,
                });
                wasSplit = true;
            }

            // Move start past this event
            if (eventEnd > slotStart) {
                slotStart = eventEnd;
            }
        }

        // Add remaining slot
        if (slotStart < currentEnd) {
            splitSlots.push({
                ...availability,
                id: wasSplit ? crypto.randomUUID() : availability.id,
                originalAvailabilityId: wasSplit ? availability.id : undefined,
                start: slotStart,
                end: currentEnd,
            });
        }
    }

    return splitSlots;
};
