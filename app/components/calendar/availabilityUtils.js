import moment from 'moment';

export const splitAvailabilities = (availabilities, events) => {
  const splitSlots = [];

  availabilities.forEach((availability) => {
    let currentStart = moment(availability.start);
    let currentEnd = moment(availability.end);

    const tempSlots = [];

    events.forEach((event) => {
      const eventStart = moment(event.start);
      const eventEnd = moment(event.end);

      if (eventStart.isBetween(currentStart, currentEnd, null, '[)') || eventEnd.isBetween(currentStart, currentEnd, null, '[)') || (eventStart.isBefore(currentStart) && eventEnd.isAfter(currentEnd))) {
        if (eventStart.isAfter(currentStart) && eventEnd.isBefore(currentEnd)) {
          tempSlots.push({
            ...availability,
            start: currentStart.toDate(),
            end: eventStart.toDate(),
          });
          currentStart = eventEnd;
        } else if (eventStart.isBefore(currentStart) && eventEnd.isAfter(currentStart) && eventEnd.isBefore(currentEnd)) {
          currentStart = eventEnd;
        } else if (eventStart.isAfter(currentStart) && eventStart.isBefore(currentEnd)) {
          tempSlots.push({
            ...availability,
            start: currentStart.toDate(),
            end: eventStart.toDate(),
          });
          currentStart = eventEnd;
        } else if (eventStart.isBefore(currentStart) && eventEnd.isAfter(currentEnd)) {
          currentStart = currentEnd; // This will skip adding this slot as it is fully covered by an event
        }
      }
    });

    if (currentStart.isBefore(currentEnd)) {
      tempSlots.push({
        ...availability,
        start: currentStart.toDate(),
        end: currentEnd.toDate(),
      });
    }

    splitSlots.push(...tempSlots);
  });

  return splitSlots;
};
