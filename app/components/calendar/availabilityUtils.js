import moment from 'moment';

export const splitAvailabilities = (availabilities, events) => {
  const splitSlots = [];

  availabilities.forEach((availability) => {
    let currentStart = moment(availability.start);
    let currentEnd = moment(availability.end);

    const tempSlots = [];

    events.forEach((event) => {
      const isEventForTutor = event.staff.some(staff => staff.value === availability.tutor);
      const isDeniedStudentEvent = event.createdByStudent && event.approvalStatus === 'denied';

      if (isEventForTutor && !isDeniedStudentEvent) {
        const eventStart = moment(event.start);
        const eventEnd = moment(event.end);

        if (eventEnd.isBefore(currentStart) || eventStart.isAfter(currentEnd)) {
          // No overlap
          return;
        }

        if (eventStart.isSameOrBefore(currentStart) && eventEnd.isSameOrAfter(currentEnd)) {
          // Event fully covers the availability
          currentStart = currentEnd;
          return;
        }

        if (eventStart.isSameOrBefore(currentStart) && eventEnd.isAfter(currentStart)) {
          // Event overlaps the start of the availability
          currentStart = eventEnd;
        } else if (eventStart.isBefore(currentEnd) && eventEnd.isSameOrAfter(currentEnd)) {
          // Event overlaps the end of the availability
          tempSlots.push({
            ...availability,
            start: currentStart.toDate(),
            end: eventStart.toDate(),
          });
          currentStart = currentEnd;
        } else if (eventStart.isAfter(currentStart) && eventEnd.isBefore(currentEnd)) {
          // Event is in the middle of the availability
          tempSlots.push({
            ...availability,
            start: currentStart.toDate(),
            end: eventStart.toDate(),
          });
          currentStart = eventEnd;
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
