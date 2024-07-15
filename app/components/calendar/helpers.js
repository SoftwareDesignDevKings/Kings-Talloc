import moment from 'moment';

export const eventStyleGetter = (event, userRole, userEmail) => {
  const isAvailability = !!event.tutor;
  const tutorResponse = event.tutorResponses?.find(response => response.email === userEmail);
  const studentResponse = event.studentResponses?.find(response => response.email === userEmail);
  const isDeclined = event.tutorResponses?.some(response => response.email === userEmail && response.response === false) || event.studentResponses?.some(response => response.email === userEmail && response.response === false);
  const needsConfirmation = userRole === 'tutor' && event.confirmationRequired && !tutorResponse;
  const needsStudentConfirmation = userRole === 'student' && event.minStudents > 0 && !studentResponse;

  const style = {
    backgroundColor: isAvailability ? 'lightgreen' : (isDeclined ? 'grey' : (needsConfirmation || needsStudentConfirmation ? 'red' : 'lightblue')),
    borderColor: isAvailability ? 'green' : (isDeclined ? 'black' : (needsConfirmation || needsStudentConfirmation ? 'red' : 'blue')),
    color: 'black',
  };

  return {
    style: style
  };
};

export const customDayPropGetter = (date, availabilities, selectedTutors) => {
  const isAvailability = availabilities.some(
    (availability) =>
      selectedTutors.some(tutor => tutor.value === availability.tutor) &&
      moment(date).isBetween(availability.start, availability.end, undefined, '[)')
  );

  if (isAvailability) {
    return {
      style: {
        backgroundColor: 'lightgreen',
      },
    };
  }

  return {};
};

export const customSlotPropGetter = (date, availabilities, selectedTutors) => {
  const isAvailability = availabilities.some(
    (availability) =>
      selectedTutors.some(tutor => tutor.value === availability.tutor) &&
      moment(date).isBetween(availability.start, availability.end, undefined, '[)')
  );

  if (isAvailability) {
    return {
      style: {
        backgroundColor: 'lightgreen',
      },
    };
  }

  return {};
};

export const messages = {
  allDay: 'All Day',
  previous: 'Back',
  next: 'Next',
  today: 'Today',
  month: 'Month',
  week: 'Week',
  day: 'Day',
  agenda: 'Agenda',
  date: 'Date',
  time: 'Time',
  event: 'Event',
  noEventsInRange: 'No events in this range.',
  showMore: total => `+${total} more`,
};