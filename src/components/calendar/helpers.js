import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';


// Helper function to calculate the green color intensity based on the number of available tutors
const calculateGreenIntensity = (numTutors, maxTutors) => {
  const intensity = Math.min(1, numTutors / maxTutors);
  const baseGreen = { r: 144, g: 238, b: 144 };
  return `rgba(${baseGreen.r}, ${baseGreen.g}, ${baseGreen.b}, ${intensity})`;
};

export const eventStyleGetter = (event, userRole, userEmail) => {
  // Figure out what type of event this is
  const isAvailability = event.tutor !== undefined && event.tutor !== null;
  const isStudentRequest = event.isStudentRequest === true;
  const isStudentEvent = event.createdByStudent === true;

  // Check if the current student has responded
  const studentResponse = event.studentResponses?.find(
    response => response.email === userEmail
  );
  const isDeclined = studentResponse && !studentResponse.response;
  const isAccepted = studentResponse && studentResponse.response;
  const needsStudentConfirmation =
    userRole === 'student' &&
    !studentResponse &&
    event.minStudents > 0;

  // Default style
  let backgroundColor = 'lightblue';
  let borderColor = 'blue';

  // --- Student-created events ---
  if (isStudentEvent) {
    if (event.approvalStatus === 'pending') {
      // Pending → red
      backgroundColor = 'red';
      borderColor = 'darkred';
    } else if (event.approvalStatus === 'approved') {
      // Approved → orange
      backgroundColor = 'orange';
      borderColor = 'darkorange';
    } else if (event.approvalStatus === 'denied') {
      // Denied → red
      backgroundColor = 'lightcoral';
      borderColor = 'red';
    }
  }

  // --- Work type and status combined ---
  if (event.workStatus === 'completed') {
    // All completed work is green
    backgroundColor = 'lightgreen';
    borderColor = 'green';
  } else if (event.workStatus === 'notAttended') {
    backgroundColor = 'lightcoral';
    borderColor = 'red';
  } else if (event.workType === 'coaching' && event.workStatus === 'notCompleted') {
    // Not completed coaching is purple
    backgroundColor = '#E6D5F5';
    borderColor = '#9B59B6';
  }
  // Other not completed work keeps the default blue (from above)

  // --- Student requests (pending approval) ---
  if (isStudentRequest) {
    backgroundColor = 'red';
    borderColor = 'darkred';
  }

  // --- Tutor availabilities ---
  if (isAvailability) {
    backgroundColor = userRole === 'student' ? 'lightgrey' : 'mediumspringgreen';
    borderColor = userRole === 'student' ? 'grey' : 'springgreen';
  }

  // --- Student responses ---
  if (isDeclined) {
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
    availability => {
      const availStart = new Date(availability.start);
      const availEnd = new Date(availability.end);
      return date >= availStart && date < availEnd;
    }
  ).length;

  const tutorsWithAvailabilitiesThisWeek = filteredAvailabilities.filter(availability => {
    const availStart = new Date(availability.start);
    return availStart >= currentWeekStart && availStart < currentWeekEnd;
  }).map(availability => availability.tutor);

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
