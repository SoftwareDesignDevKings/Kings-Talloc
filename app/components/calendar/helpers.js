import moment from 'moment';

// Helper function to calculate the green color intensity based on the number of available tutors
const calculateGreenIntensity = (numTutors, maxTutors) => {
  const intensity = Math.min(1, numTutors / maxTutors);
  const baseGreen = { r: 144, g: 238, b: 144 }; // Original lightgreen color: rgb(144, 238, 144)
  return `rgba(${baseGreen.r}, ${baseGreen.g}, ${baseGreen.b}, ${intensity})`;
};

export const eventStyleGetter = (event, userRole, userEmail) => {
  const isAvailability = !!event.tutor;
  const studentResponse = event.studentResponses?.find(response => response.email === userEmail);
  const isDeclined = studentResponse && !studentResponse.response;
  const isAccepted = studentResponse && studentResponse.response;
  const needsStudentConfirmation = userRole === 'student' && !studentResponse && event.minStudents > 0;

  let backgroundColor = 'lightblue';
  let borderColor = 'blue';

  if (isAvailability) {
    backgroundColor = 'lightgreen';
    borderColor = 'green';
  } else if (event.createdByStudent && event.approvalStatus === 'pending') {
    backgroundColor = 'orange';
    borderColor = 'darkorange';
  } else if (event.approvalStatus === 'denied') {
    backgroundColor = 'lightcoral';
    borderColor = 'red';
  } else if (isDeclined) {
    backgroundColor = 'grey';
    borderColor = 'black';
  } else if (isAccepted) {
    backgroundColor = 'lightblue';
    borderColor = 'blue';
  } else if (needsStudentConfirmation) {
    backgroundColor = 'red';
    borderColor = 'darkred';
  }

  return {
    style: {
      backgroundColor,
      borderColor,
      color: 'black',
    },
  };
};


export const customSlotPropGetter = (date, availabilities, selectedTutors) => {
  const availableTutors = availabilities.filter(
    (availability) =>
      selectedTutors.some(tutor => tutor.value === availability.tutor) &&
      moment(date).isBetween(availability.start, availability.end, undefined, '[)')
  ).length;

  if (availableTutors > 0) {
    const maxTutors = selectedTutors.length || 1; // To prevent division by zero
    const backgroundColor = calculateGreenIntensity(availableTutors, maxTutors);

    return {
      style: {
        backgroundColor,
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
