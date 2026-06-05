import { addWeeks } from 'date-fns';
import { recurringCalendarExpand } from '@/utils/calendarRecurringEvents';

/**
 * Normalise workType to an array, handling both the legacy string format
 * ('tutoring', 'tutoringOrWork', …) and the current array format (['tutoring', 'work']).
 */
export const normaliseWorkType = (workType) => {
    if (!workType) return [];
    if (Array.isArray(workType)) return workType;
    if (workType === 'tutoringOrWork') return ['tutoring', 'work'];
    return [workType];
};

/**
 * Returns the Set of subject IDs covered by a student's enrolled classes.
 */
export const getEnrolledSubjectIds = (classes, userEmail) =>
    new Set(
        classes
            .filter(cls => cls.students?.some(s => s.email === userEmail))
            .map(cls => cls.subject)
            .filter(Boolean)
    );

/**
 * Returns the Set of tutor emails across a given set of subject IDs.
 */
export const getEnrolledTutorEmails = (subjects, enrolledSubjectIds) =>
    new Set(
        subjects
            .filter(s => enrolledSubjectIds.has(s.id))
            .flatMap(s => (s.tutors || []).map(t => t.email))
    );

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
    for (const tutorEvents of eventsByTutor.values()) {
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
            const remainingSlot = {
                ...availability,
                id: wasSplit ? crypto.randomUUID() : availability.id,
                start: slotStart,
                end: currentEnd,
            };

            if (wasSplit) {
                remainingSlot.originalAvailabilityId = availability.id;
            }

            splitSlots.push(remainingSlot);
        }
    }

    return splitSlots;
};

/**
 * Returns conflicts where a proposed event overlaps an existing shift for any of the given staff.
 * `excludeEventId` should be the id of the event being edited so it doesn't conflict with itself.
 */
export const getTutorShiftConflicts = (staffList, start, end, existingShifts, excludeEventId = null) => {
    if (!staffList?.length || !existingShifts?.length) return [];

    const proposedStart = new Date(start).getTime();
    const proposedEnd = new Date(end).getTime();
    const conflicts = [];

    for (const staffMember of staffList) {
        const tutorEmail = staffMember.value || staffMember.email || staffMember;
        const tutorName = staffMember.label || tutorEmail;

        for (const shift of existingShifts) {
            if (
                excludeEventId &&
                (shift.id === excludeEventId ||
                    shift.recurringEventId === excludeEventId ||
                    String(shift.id || '').startsWith(`${excludeEventId}_occurrence_`))
            ) {
                continue;
            }
            if (!shift.staff?.some((s) => (s.value || s) === tutorEmail)) continue;

            const shiftStart = new Date(shift.start).getTime();
            const shiftEnd = new Date(shift.end).getTime();

            if (shiftStart < proposedEnd && shiftEnd > proposedStart) {
                conflicts.push({ tutorName, conflictTitle: shift.title, conflictStart: shift.start, conflictEnd: shift.end });
            }
        }
    }

    return conflicts;
};

/**
 * Like `getTutorShiftConflicts`, but for a *prospective* recurring series.
 * Expands the proposed series into its occurrences (reusing the same
 * `recurringCalendarExpand` the calendar uses) and checks each occurrence for
 * tutor overlaps. Conflicts are de-duplicated by the conflicting shift's time
 * window so the same existing shift isn't reported repeatedly.
 */
export const getRecurringSeriesConflicts = (
    staffList,
    baseStart,
    baseEnd,
    recurring,
    occurrences,
    existingShifts,
    excludeEventId = null,
) => {
    if (!recurring) {
        return getTutorShiftConflicts(staffList, baseStart, baseEnd, existingShifts, excludeEventId);
    }

    const start = new Date(baseStart);
    const end = new Date(baseEnd);
    const syntheticSeries = [{
        id: excludeEventId || '__prospective_series__',
        recurring,
        start,
        end,
        occurenceNum: occurrences || undefined,
    }];

    const occurrenceInstances = recurringCalendarExpand(syntheticSeries, {
        rangeStart: start,
        rangeEnd: addWeeks(start, 53),
        maxOccurrences: 52,
    });

    const conflictsByWindow = new Map();
    for (const occurrence of occurrenceInstances) {
        const occConflicts = getTutorShiftConflicts(
            staffList,
            occurrence.start,
            occurrence.end,
            existingShifts,
            excludeEventId,
        );
        for (const conflict of occConflicts) {
            const key = `${conflict.tutorName}|${new Date(conflict.conflictStart).getTime()}|${new Date(conflict.conflictEnd).getTime()}`;
            if (!conflictsByWindow.has(key)) conflictsByWindow.set(key, conflict);
        }
    }

    return [...conflictsByWindow.values()];
};

/**
 * Check whether `[start, end]` is fully covered by availability blocks for the
 * given tutor email. Used to gate student-request drag/resize so a pending
 * request can only land in a slot where its assigned tutor is still free.
 *
 * Accepts the post-split availability list (the same one rendered as the
 * green availability overlay), so already-booked time is naturally excluded.
 */
export const isRangeCoveredByTutorAvailability = (
    tutorEmail,
    start,
    end,
    availabilities,
) => {
    if (!tutorEmail || !start || !end || !availabilities?.length) return false;
    const rangeStart = new Date(start).getTime();
    const rangeEnd = new Date(end).getTime();
    if (rangeEnd <= rangeStart) return false;

    const tutorSlots = availabilities
        .filter((a) => a.tutor === tutorEmail)
        .map((a) => ({
            start: new Date(a.start).getTime(),
            end: new Date(a.end).getTime(),
        }))
        .filter((a) => a.end > rangeStart && a.start < rangeEnd)
        .sort((a, b) => a.start - b.start);

    let cursor = rangeStart;
    for (const slot of tutorSlots) {
        if (slot.start > cursor) return false;
        if (slot.end > cursor) cursor = slot.end;
        if (cursor >= rangeEnd) return true;
    }
    return cursor >= rangeEnd;
};
