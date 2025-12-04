// import { isBefore, isAfter } from 'date-fns';

/**
 * Filter availabilities based on role and filters
 */
export const calendarAvailabilityFilter = (splitAvailabilitiesData, { userRole, filters }) => {
    let filtered = splitAvailabilitiesData;
    const { subject, tutors, visibility, availabilityWorkType } = filters;

    // student view - only filter events by tutoring / tutoring || work 
    if (userRole === 'student') {
        filtered = filtered.filter((availability) => availability.workType === 'tutoring' || 
                                                     availability.workType === 'tutoringOrWork'
        );
    }
    
    if (userRole === 'teacher' && availabilityWorkType) {
        filtered = filtered.filter(
            (availability) => availability.workType === availabilityWorkType,
        );
    }

    if ((userRole === 'tutor' || userRole === 'teacher') && visibility?.hideTutoringAvailabilites) {
        filtered = filtered.filter((availability) => !(availability.workType === 'tutoring'));
    }

    if ((userRole === 'tutor' || userRole === 'teacher') && visibility?.hideWorkAvailabilities) {
        filtered = filtered.filter((availability) => !(availability.workType === 'work'));
    }

    if (
        (userRole === 'tutor' || userRole === 'teacher') &&
        visibility?.hideTutoringAvailabilites &&
        visibility?.hideWorkAvailabilities
    ) {
        filtered = filtered.filter((availability) => !(availability.workType === 'tutoringOrWork'));
    }

    if (subject) {
        if (tutors?.length > 0) {
            filtered = filtered.filter((avail) => tutors.some((tutor) => tutor.value === avail.tutor));
        } else {
            filtered = filtered.filter((avail) =>
                subject.tutors.some((tutor) => tutor.email === avail.tutor),
            );
        }
    } else if (tutors?.length > 0) {
        filtered = filtered.filter((avail) => tutors.some((tutor) => tutor.value === avail.tutor));
    }

    return filtered;
};

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
        for (const staff of event.staff) {
            const tutorEmail = staff.value;
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

        for (const event of tutorEvents) {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);

            // Skip events that don't overlap
            if (eventStart >= currentEnd || eventEnd <= slotStart) continue;

            // Add slot before event if there's a gap
            if (eventStart > slotStart) {
                splitSlots.push({
                    ...availability,
                    start: slotStart,
                    end: eventStart,
                });
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
                start: slotStart,
                end: currentEnd,
            });
        }
    }

    return splitSlots;
};
