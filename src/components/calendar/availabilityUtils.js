import { isBefore, isAfter } from 'date-fns';

export const splitAvailabilities = (availabilities, events) => {
  const splitSlots = [];

  availabilities.forEach((availability) => {
    let currentStart = new Date(availability.start);
    let currentEnd = new Date(availability.end);

    // Sort events by start time to handle them in order
    const sortedEvents = events
      .filter(event => event.staff.some(staff => staff.value === availability.tutor) && !(event.createdByStudent && event.approvalStatus === 'denied'))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    sortedEvents.forEach((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      // Only consider events that overlap with the current availability window
      if (isBefore(eventStart, currentEnd) && isAfter(eventEnd, currentStart)) {
        if (isAfter(eventStart, currentStart)) {
          // Add the available slot before the event starts
          splitSlots.push({
            ...availability,
            start: currentStart,
            end: eventStart,
          });
        }
        // Move the current start to the end of the current event
        currentStart = isAfter(eventEnd, currentStart) ? eventEnd : currentStart;
      }
    });

    // Add the remaining availability slot after the last event
    if (isBefore(currentStart, currentEnd)) {
      splitSlots.push({
        ...availability,
        start: currentStart,
        end: currentEnd,
      });
    }
  });

  return splitSlots;
};
