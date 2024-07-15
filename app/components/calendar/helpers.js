import moment from 'moment';

export const eventStyleGetter = (event, userRole, userEmail) => {
  const isAvailability = !!event.tutor;
  const tutorResponse = event.tutorResponses?.find(response => response.email === userEmail);
  const studentResponse = event.studentResponses?.find(response => response.email === userEmail);
  const isDeclined = event.tutorResponses?.some(response => response.email === userEmail && response.response === false) || event.studentResponses?.some(response => response.email === userEmail && response.response === false);
  const needsConfirmation = userRole === 'tutor' && event.confirmationRequired && !tutorResponse;
  const needsStudentConfirmation = userRole === 'student' && event.minStudents > 0 && !studentResponse;
  const isStudentCreated = event.createdByStudent && (userRole === 'teacher' || userRole === 'tutor') && event.approvalStatus === 'pending';

  let backgroundColor = 'lightblue';
  let borderColor = 'blue';

  if (isAvailability) {
    backgroundColor = 'lightgreen';
    borderColor = 'green';
  } else if (isStudentCreated) {
    backgroundColor = 'orange';
    borderColor = 'darkorange';
  } else if (event.approvalStatus === 'denied') {
    backgroundColor = 'lightcoral';
    borderColor = 'red';
  } else if (isDeclined) {
    backgroundColor = 'grey';
    borderColor = 'black';
  } else if (needsConfirmation || needsStudentConfirmation) {
    backgroundColor = 'red';
    borderColor = 'red';
  } else if (userRole === 'student' && event.createdByStudent) {
    if (event.approvalStatus === 'approved') {
      backgroundColor = 'lightblue';
      borderColor = 'blue';
    } else if (event.approvalStatus === 'denied') {
      backgroundColor = 'lightcoral';
      borderColor = 'red';
    } else {
      backgroundColor = 'orange';
      borderColor = 'darkorange';
    }
  }

  return {
    style: {
      backgroundColor,
      borderColor,
      color: 'black',
    },
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
