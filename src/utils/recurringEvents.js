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
export const expandRecurringEvents = (events, options = {}) => {
  const {
    rangeStart = new Date(),
    rangeEnd = addWeeks(new Date(), 52),
    maxOccurrences = 52
  } = options;

  const expandedEvents = [];

  for (const event of events) {
    
    // Non-recurring events pass through as-is
    if (!event.recurring) {
      expandedEvents.push(event);
      continue;
    }

    // Calculate recurring event parameters
    const { recurring, start, end } = event;
    const eventDuration = end.getTime() - start.getTime();
    const weeksToAdd = recurring === 'weekly' ? 1 : 2;
    const maxLimit = recurring === 'weekly' ? maxOccurrences : Math.floor(maxOccurrences / 2);

    // Generate recurring event instances
    for (let i = 0; i < maxLimit; i++) {
      const occurrenceStart = addWeeks(start, i * weeksToAdd);
      const occurrenceEnd = new Date(occurrenceStart.getTime() + eventDuration);

      // Only add if within date range
      if (!isBefore(occurrenceStart, rangeStart) && isBefore(occurrenceStart, rangeEnd)) {
        expandedEvents.push({
          ...event,
          id: `${event.id}_occurrence_${i}`,
          start: new Date(occurrenceStart),
          end: occurrenceEnd,
          isRecurringInstance: true,
          originalEventId: event.id,
          occurrenceIndex: i
        });
      }
    }
  }

  return expandedEvents;
};
