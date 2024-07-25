import moment from 'moment';

// Helper function to calculate the green color intensity based on the number of available tutors
const calculateGreenIntensity = (numTutors, maxTutors) => {
  const intensity = Math.min(1, numTutors / maxTutors);
  const baseGreen = { r: 144, g: 238, b: 144 };
  return `rgba(${baseGreen.r}, ${baseGreen.g}, ${baseGreen.b}, ${intensity})`;
};

export const eventStyleGetter = (event, userRole, userEmail) => {
  const isAvailability = !!event.tutor;
  const studentResponse = event.studentResponses?.find(response => response.email === userEmail);
  const isDeclined = studentResponse && !studentResponse.response;
  const isAccepted = studentResponse && studentResponse.response;
  const needsStudentConfirmation = userRole === 'student' && !studentResponse && event.minStudents > 0;

  let backgroundColor = 'lightblue'; // Default for not completed
  let borderColor = 'blue'; // Default for not completed

  if (event.workStatus === 'completed') {
    backgroundColor = 'lightgreen'; // Light green for completed
    borderColor = 'green'; // Green border for completed
  } else if (event.workStatus === 'notCompleted') {
    backgroundColor = 'lightblue';
    borderColor = 'blue';
  } else if (event.workStatus === 'notAttended') {
    backgroundColor = 'lightcoral';
    borderColor = 'red';
  } else if (isAvailability) {
    backgroundColor = 'mediumspringgreen'; // Lighter green for availability
    borderColor = 'springgreen'; // Slightly darker border color for availability
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

export const customSlotPropGetter = (date, availabilities, selectedTutors, currentWeekStart, currentWeekEnd) => {
  const filteredAvailabilities = selectedTutors.length > 0 
    ? availabilities.filter(availability => selectedTutors.some(tutor => tutor.value === availability.tutor))
    : availabilities;

  const availableTutors = filteredAvailabilities.filter(
    availability => moment(date).isBetween(availability.start, availability.end, undefined, '[)')
  ).length;

  const tutorsWithAvailabilitiesThisWeek = filteredAvailabilities.filter(availability =>
    moment(availability.start).isBetween(currentWeekStart, currentWeekEnd, null, '[)')
  ).map(availability => availability.tutor);

  const uniqueTutorsThisWeek = [...new Set(tutorsWithAvailabilitiesThisWeek)];

  const maxTutors = uniqueTutorsThisWeek.length || 1; // To prevent division by zero

  if (availableTutors > 0) {
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
