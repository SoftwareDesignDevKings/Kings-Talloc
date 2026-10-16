import { schedulingMutation } from '@/firestore/schedulingClient';
import { calendarEventGetType } from '@/utils/calendarEvent';

/**
 * Detaches a recurring instance from its series and creates a standalone event
 * @param {Object} recurringInstance - The recurring event instance to detach
 * @param {Object} updatedFields - Fields to update in the new standalone event (e.g., { start, end })
 * @returns {Promise<string>} The new document ID of the standalone event
 */
export const detachRecurringInstance = async (recurringInstance, updatedFields = {}) => {
    const { collectionName } = calendarEventGetType(recurringInstance);

    const result = await schedulingMutation({ action: 'detach', collectionName,
        id: recurringInstance.recurringEventId, expectedRevision: recurringInstance.revision || 0, occurrenceIndex: recurringInstance.occurrenceIndex, data: updatedFields });
    return result.id;
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
export { expandRecurringEvents as recurringCalendarExpand } from '@/lib/scheduling/eventRules';
