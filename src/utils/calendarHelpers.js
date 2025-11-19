/**
 * Pure helper functions for calendar operations
 * No React hooks or side effects
 */

/**
 * Determines event type and Firestore collection name
 */
export const getEventType = (event) => {
  const isAvailability = !!event.tutor;
  const isStudentRequest = !!event.isStudentRequest;

  let collectionName = "events";
  if (isAvailability) {
    collectionName = "tutorAvailabilities";
  } else if (isStudentRequest) {
    collectionName = "studentEventRequests";
  }

  return { isAvailability, isStudentRequest, collectionName };
};

/**
 * Check if user owns an event
 */
export const userOwnsEvent = (event, userEmail, userRole) => {
  if (event.tutor) {
    return userRole === 'tutor' && event.tutor === userEmail;
  }

  if (event.isStudentRequest) {
    return event.students?.some(s => s.value === userEmail || s === userEmail);
  }

  return userRole === 'teacher';
};

/**
 * Check if user can drag/resize event
 */
export const canModifyEvent = (event, userEmail, userRole) => {
  // Tutors can only modify their own availabilities
  if (userRole === 'tutor') {
    return event.tutor === userEmail;
  }

  // Students can only modify their own pending requests
  if (userRole === 'student') {
    if (!event.isStudentRequest) return false;
    return event.students?.some(s => s.value === userEmail || s === userEmail);
  }

  // Teachers can modify everything except student requests
  return userRole === 'teacher' && !event.isStudentRequest;
};

/**
 * Get default event data based on user role
 */
export const getDefaultEventData = (slotInfo, userRole, userEmail) => {
  const start = slotInfo.start;
  let end = slotInfo.end;

  // Default to 1 hour if slot is 30 minutes
  const duration = (end - start) / (1000 * 60);
  if (duration === 30) {
    end = new Date(start.getTime() + 60 * 60 * 1000);
  }

  if (userRole === 'tutor') {
    return {
      title: 'Availability',
      start,
      end,
      tutor: userEmail,
      workType: 'tutoringOrWork',
      locationType: ''
    };
  }

  if (userRole === 'student') {
    return {
      title: '',
      start,
      end,
      description: '',
      staff: [],
      students: [{ value: userEmail, label: userEmail }],
      confirmationRequired: false,
      createdByStudent: true,
      approvalStatus: 'pending',
      workStatus: 'notCompleted',
      locationType: '',
    };
  }

  // Teacher
  return {
    title: '',
    start,
    end,
    description: '',
    confirmationRequired: false,
    staff: [],
    classes: [],
    students: [],
    tutorResponses: [],
    studentResponses: [],
    minStudents: 0,
    workStatus: 'notCompleted',
    locationType: '',
  };
};

/**
 * Filter events based on role and filters
 */
export const filterEvents = (allEvents, { userRole, userEmail, filters }) => {
  let filtered = [...allEvents];
  const { visibility, tutors, workType } = filters;

  // Apply role-based filters
  if (userRole === 'tutor') {
    filtered = filtered.filter(event =>
      event.staff.some(staff => staff.value === userEmail)
    );

    if (visibility?.hideOwnAvailabilities) {
      filtered = filtered.filter(event => event.tutor !== userEmail);
    }
  }

  if ((userRole === 'tutor' || userRole === 'teacher') && visibility?.hideDeniedStudentEvents) {
    filtered = filtered.filter(event =>
      !(event.createdByStudent && event.approvalStatus === 'denied')
    );
  }

  // Apply tutor filter
  if (tutors?.length > 0) {
    const selectedTutorValues = tutors.map(tutor => tutor.value);
    filtered = filtered.filter(event =>
      event.staff.some(staff => selectedTutorValues.includes(staff.value))
    );
  }

  // Apply work type filter for teachers based on checkboxes
  if (userRole === 'teacher') {
    if (!visibility?.showTutoringEvents && !visibility?.showCoachingEvents) {
      filtered = [];
    } else if (!visibility?.showTutoringEvents) {
      filtered = filtered.filter(event => event.workType === 'coaching');
    } else if (!visibility?.showCoachingEvents) {
      filtered = filtered.filter(event => event.workType === 'tutoring');
    }
  }

  return filtered;
};

/**
 * Filter availabilities based on role and filters
 */
export const filterAvailabilities = (splitAvailabilitiesData, { userRole, filters }) => {
  let filtered = splitAvailabilitiesData;
  const { subject, tutors, visibility, availabilityWorkType } = filters;

  if (userRole === "student") {
    filtered = filtered.filter(availability =>
      (availability.workType === 'tutoring' || availability.workType === 'tutoringOrWork' || availability.workType === undefined)
    );
  }

  // Apply availability work type filter for teachers
  if (userRole === 'teacher' && availabilityWorkType) {
    filtered = filtered.filter(availability => availability.workType === availabilityWorkType);
  }

  if ((userRole === 'tutor' || userRole === 'teacher') && visibility?.hideTutoringAvailabilites) {
    filtered = filtered.filter(availability =>
      !(availability.workType === 'tutoring')
    );
  }

  if ((userRole === 'tutor' || userRole === 'teacher') && visibility?.hideWorkAvailabilities) {
    filtered = filtered.filter(availability =>
      !(availability.workType === 'work')
    );
  }

  if ((userRole === 'tutor' || userRole === 'teacher') && visibility?.hideTutoringAvailabilites && visibility?.hideWorkAvailabilities) {
    filtered = filtered.filter(availability =>
      !(availability.workType === 'tutoringOrWork')
    );
  }

  if (subject) {
    if (tutors?.length > 0) {
      return filtered.filter(avail =>
        tutors.some(tutor => tutor.value === avail.tutor)
      );
    } else {
      return filtered.filter(avail =>
        subject.tutors.some(tutor => tutor.email === avail.tutor)
      );
    }
  }

  if (tutors?.length > 0) {
    return filtered.filter(avail =>
      tutors.some(tutor => tutor.value === avail.tutor)
    );
  }

  return filtered;
};
