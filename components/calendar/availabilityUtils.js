import moment from 'moment';

export const splitAvailabilities = (availabilities, events) => {
  const splitSlots = [];

  availabilities.forEach((availability) => {
    let currentStart = moment(availability.start);
    let currentEnd = moment(availability.end);

    // Sort events by start time to handle them in order
    const sortedEvents = events
      .filter(event => event.staff.some(staff => staff.value === availability.tutor) && !(event.createdByStudent && event.approvalStatus === 'denied'))
      .sort((a, b) => moment(a.start).diff(moment(b.start)));

    sortedEvents.forEach((event) => {
      const eventStart = moment(event.start);
      const eventEnd = moment(event.end);

      // Only consider events that overlap with the current availability window
      if (eventStart.isBefore(currentEnd) && eventEnd.isAfter(currentStart)) {
        if (eventStart.isAfter(currentStart)) {
          // Add the available slot before the event starts
          splitSlots.push({
            ...availability,
            start: currentStart.toDate(),
            end: eventStart.toDate(),
          });
        }
        // Move the current start to the end of the current event
        currentStart = eventEnd.isAfter(currentStart) ? eventEnd : currentStart;
      }
    });

    // Add the remaining availability slot after the last event
    if (currentStart.isBefore(currentEnd)) {
      splitSlots.push({
        ...availability,
        start: currentStart.toDate(),
        end: currentEnd.toDate(),
      });
    }
  });

  return splitSlots;
};
