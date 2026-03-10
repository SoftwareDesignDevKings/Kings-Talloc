import { addWeeks, isBefore } from 'date-fns';
import { addEventException, createEventInFirestore } from '@/firestore/firestoreOperations';
import { calendarEventGetType } from '@/utils/calendarEvent';

/**
 * Detaches a recurring instance from its series and creates a standalone event
 * @param {Object} recurringInstance - The recurring event instance to detach
 * @param {Object} updatedFields - Fields to update in the new standalone event (e.g., { start, end })
 * @returns {Promise<string>} The new document ID of the standalone event
 */
export const detachRecurringInstance = async (recurringInstance, updatedFields = {}) => {
    const { collectionName } = calendarEventGetType(recurringInstance);

    // Add exception to the original recurring event
    await addEventException(
        recurringInstance.recurringEventId,
        recurringInstance.occurrenceIndex,
        collectionName
    );

    // Strip recurring-related fields and apply updates
    const {
        id,
        recurringEventId,
        isRecurringInstance,
        occurrenceIndex,
        recurring,
        eventExceptions,
        until,
        occurenceNum,
        ...standaloneEventData
    } = { ...recurringInstance, ...updatedFields };

    // explicitly set recurring to null so Firestore queries can find it
    standaloneEventData.recurring = null;

    // create new standalone event
    const newDocId = await createEventInFirestore(standaloneEventData, collectionName);

    return newDocId;
};

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

        // Calculate recurring event parameters
        const { recurring, start, end, eventExceptions = [], until, occurenceNum } = event;
        const eventDuration = end.getTime() - start.getTime();

        let weeksToAdd;
        let maxLimit;

        if (recurring === 'weekly') {
            weeksToAdd = 1;
            // Use event's occurenceNum if available, otherwise fall back to maxOccurrences
            maxLimit = occurenceNum || maxOccurrences;
        } else {
            weeksToAdd = 2;
            // Use event's occurenceNum if available, otherwise fall back to calculated value
            maxLimit = occurenceNum || Math.floor(maxOccurrences / 2);
        }

        const untilDate = until || null;

        // Generate recurring event instances (start at i=0 to include first occurrence as instance)
        for (let i = 0; i < maxLimit; i++) {
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
