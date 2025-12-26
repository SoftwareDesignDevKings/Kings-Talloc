import { addWeeks, isBefore } from 'date-fns';

/**
 * Expands recurring events into individual event instances in memory
 * @param {Array} events - Array of events from Firestore (may include recurring events)
 * @param {Object} options - Configuration options
 * @param {Date} options.rangeStart - Start date for generating recurring events
 * @param {Date} options.rangeEnd - End date for generating recurring events
 * @param {number} options.maxOccurrences - Maximum number of occurrences to generate (default: 52 for weekly, 26 for fortnightly)
 * @returns {Array} Expanded array of events with recurring events duplicated
 */
export const recurringCalendarExpand = (events, options = {}) => {
    const {
        rangeStart = new Date(),
        rangeEnd = addWeeks(new Date(), 52),
        maxOccurrences = 52,
    } = options;

    const expandedEvents = [];

    for (const event of events) {
        // Non-recurring events pass through as-is
        if (!event.recurring) {
            expandedEvents.push(event);
            continue;
        }

        // Add the original recurring event
        expandedEvents.push(event);

        // Calculate recurring event parameters
        const { recurring, start, end, eventExceptions = [], until } = event;
        const eventDuration = end.getTime() - start.getTime();

        let weeksToAdd;
        let maxLimit;

        if (recurring === 'weekly') {
            weeksToAdd = 1;
            maxLimit = maxOccurrences;
        } else {
            weeksToAdd = 2;
            maxLimit = Math.floor(maxOccurrences / 2);
        }

        const untilDate = until || null;

        // Generate recurring event instances (start at i=1 since original event is already added)
        for (let i = 1; i < maxLimit; i++) {
            // Skip if this occurrence is in the exceptions list
            if (eventExceptions.includes(i)) {
                continue;
            }

            const occurrenceStart = addWeeks(start, i * weeksToAdd);
            const occurrenceEnd = new Date(occurrenceStart.getTime() + eventDuration);

            // Stop generating if occurrence is after 'until' date
            if (untilDate && occurrenceStart > untilDate) {
                break;
            }

            // Only add if within date range
            if (!isBefore(occurrenceStart, rangeStart) && isBefore(occurrenceStart, rangeEnd)) {
                expandedEvents.push({
                    ...event,
                    recurringEventId: event.id,
                    id: `${event.id}_occurrence_${i}`,
                    start: new Date(occurrenceStart),
                    end: occurrenceEnd,
                    isRecurringInstance: true,
                    occurrenceIndex: i,
                });
            }
        }
    }

    return expandedEvents;
};
