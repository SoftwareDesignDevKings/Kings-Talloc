/**
 * Pure event operation functions
 * No React hooks or state - just business logic
 */

import {
	updateEventInFirestore,
	createEventInFirestore,
	deleteEventFromFirestore,
	addEventException,
	setRecurringUntilDate,
	removeEventFromQueue,
	addOrUpdateEventInQueue
} from "@/firestore/firebaseOperations";
import { createTeamsMeeting, updateTeamsMeeting, deleteTeamsMeeting } from "@/utils/msTeams";
import { getEventType } from "@/utils/calendarHelpers";

/**
 * Update event state optimistically
 */
export const updateEventInState = (eventId, updatedEvent, isAvailability, isStudentRequest, { setAllEvents, setAvailabilities, setStudentRequests }) => {
	if (isAvailability) {
		setAvailabilities(prev => prev.map(avail => avail.id === eventId ? updatedEvent : avail));
	} else if (isStudentRequest) {
		setStudentRequests(prev => prev.map(req => req.id === eventId ? updatedEvent : req));
	} else {
		setAllEvents(prev => prev.map(evt => evt.id === eventId ? updatedEvent : evt));
	}
};

/**
 * Revert state on error
 */
export const revertEventState = (previousEvents, previousAvailabilities, previousStudentRequests, isAvailability, isStudentRequest, { setAllEvents, setAvailabilities, setStudentRequests }) => {
	if (isAvailability) {
		setAvailabilities(previousAvailabilities);
	} else if (isStudentRequest) {
		setStudentRequests(previousStudentRequests);
	} else {
		setAllEvents(previousEvents);
	}
};

/**
 * Update Teams meeting if exists
 */
export const updateTeamsMeetingIfExists = async (event, start, end, isAvailability, isStudentRequest, { setAlertType, setAlertMessage }) => {
	if (!event.teamsEventId || isAvailability || isStudentRequest) return;

	const subject = event.title;
	const description = event.description || "";
	const startTime = new Date(start).toISOString();
	const endTime = new Date(end).toISOString();
	const attendees = [...event.students || [], ...event.staff || []].map(p => p.value || p);

	try {
		await updateTeamsMeeting(event.teamsEventId, subject, description, startTime, endTime, attendees);
		setAlertType("success");
		setAlertMessage("Teams meeting updated successfully");
	} catch (error) {
		console.error("Failed to update Teams meeting:", error);
		setAlertType("error");
		setAlertMessage(`Failed to update Teams meeting: ${error.message}`);
	}
};

/**
 * Handle event drop (drag and drop)
 */
export const handleEventDrop = async ({ event, start, end }, updateOption, { userRole, userEmail, allEvents, 
	availabilities, studentRequests, setAllEvents, setAvailabilities, setStudentRequests, setAlertType, setAlertMessage }
) => {
  const { isAvailability, isStudentRequest, collectionName } = getEventType(event);

  // Permission checks
  if (userRole === "student") {
    if (!isStudentRequest) return;
    const isOwnRequest = event.students?.some(s => (s.value || s) === userEmail);
    if (!isOwnRequest) return;
  }

  if (userRole === "tutor" && !isAvailability) return;

  const duration = event.end - event.start;
  const updatedEnd = new Date(start.getTime() + duration);
  const updatedEvent = { ...event, start, end: updatedEnd };

  const previousEvents = [...allEvents];
  const previousAvailabilities = [...availabilities];
  const previousStudentRequests = [...studentRequests];

  updateEventInState(event.id, updatedEvent, isAvailability, isStudentRequest, { setAllEvents, setAvailabilities, setStudentRequests });

  try {
    if (event.isRecurringInstance && event.recurringEventId) {
      if (updateOption === 'this') {
        await addEventException(event.recurringEventId, event.occurrenceIndex, collectionName);
        const { id, recurringEventId, isRecurringInstance, occurrenceIndex, recurring, eventExceptions, until, ...eventWithoutRecurringFields } = event;
        const newEvent = {
          ...eventWithoutRecurringFields,
          start: new Date(start),
          end: updatedEnd,
        };
        await createEventInFirestore(newEvent, collectionName);
      } else if (updateOption === 'thisAndFuture') {
        const untilDate = new Date(event.start);
        untilDate.setDate(untilDate.getDate() - 1);
        await setRecurringUntilDate(event.recurringEventId, untilDate, collectionName);
        const { id, recurringEventId, isRecurringInstance, occurrenceIndex, eventExceptions, ...eventWithoutInstanceFields } = event;
        const newEvent = {
          ...eventWithoutInstanceFields,
          start: new Date(start),
          end: updatedEnd,
        };
        await createEventInFirestore(newEvent, collectionName);
      }
    } else {
      await updateEventInFirestore(event.id, {
        start: new Date(start),
        end: updatedEnd,
      }, collectionName);
    }

    await updateTeamsMeetingIfExists(event, start, updatedEnd, isAvailability, isStudentRequest, { setAlertType, setAlertMessage });
  } catch (error) {
    console.error("Failed to update event:", error);
    revertEventState(previousEvents, previousAvailabilities, previousStudentRequests, isAvailability, isStudentRequest, { setAllEvents, setAvailabilities, setStudentRequests });
  }
};

/**
 * Handle event resize
 */
export const handleEventResize = async (
  { event, start, end },
  updateOption,
  { userRole, userEmail, allEvents, availabilities, studentRequests, setAllEvents, setAvailabilities, setStudentRequests, setAlertType, setAlertMessage }
) => {
  const { isAvailability, isStudentRequest, collectionName } = getEventType(event);

  // Permission checks
  if (userRole === "student") {
    if (!isStudentRequest) return;
    const isOwnRequest = event.students?.some(s => (s.value || s) === userEmail);
    if (!isOwnRequest) return;
  }

  if (userRole === "tutor" && !isAvailability) return;

  const updatedEvent = { ...event, start, end };

  const previousEvents = [...allEvents];
  const previousAvailabilities = [...availabilities];
  const previousStudentRequests = [...studentRequests];

  updateEventInState(event.id, updatedEvent, isAvailability, isStudentRequest, { setAllEvents, setAvailabilities, setStudentRequests });

  try {
    if (event.isRecurringInstance && event.recurringEventId) {
      if (updateOption === 'this') {
        await addEventException(event.recurringEventId, event.occurrenceIndex, collectionName);
        const { id, recurringEventId, isRecurringInstance, occurrenceIndex, recurring, eventExceptions, until, ...eventWithoutRecurringFields } = event;
        const newEvent = {
          ...eventWithoutRecurringFields,
          start: new Date(start),
          end: new Date(end),
        };
        await createEventInFirestore(newEvent, collectionName);
      } else if (updateOption === 'thisAndFuture') {
        const untilDate = new Date(event.start);
        untilDate.setDate(untilDate.getDate() - 1);
        await setRecurringUntilDate(event.recurringEventId, untilDate, collectionName);
        const { id, recurringEventId, isRecurringInstance, occurrenceIndex, eventExceptions, ...eventWithoutInstanceFields } = event;
        const newEvent = {
          ...eventWithoutInstanceFields,
          start: new Date(start),
          end: new Date(end),
        };
        await createEventInFirestore(newEvent, collectionName);
      }
    } else {
      await updateEventInFirestore(event.id, {
        start: new Date(start),
        end: new Date(end),
      }, collectionName);
    }

    await updateTeamsMeetingIfExists(event, start, end, isAvailability, isStudentRequest, { setAlertType, setAlertMessage });
  } catch (error) {
    console.error("Failed to update event:", error);
    revertEventState(previousEvents, previousAvailabilities, previousStudentRequests, isAvailability, isStudentRequest, { setAllEvents, setAvailabilities, setStudentRequests });
  }
};

/**
 * Handle event deletion
 */
export const handleEventDelete = async (
  eventToDelete,
  deleteOption,
  { setAllEvents, setAvailabilities, setStudentRequests, setAlertType, setAlertMessage }
) => {
  if (!eventToDelete || !eventToDelete.id) return;

  const { isAvailability, isStudentRequest, collectionName } = getEventType(eventToDelete);
  const recurringEventId = eventToDelete.recurringEventId;
  const hasRecurring = !!eventToDelete.recurring;

  try {
    if (hasRecurring && deleteOption === "all") {
      await deleteEventFromFirestore(eventToDelete.id, collectionName);
      await removeEventFromQueue(eventToDelete.id);

      setAllEvents(prev => prev.filter(event =>
        event.id !== eventToDelete.id && event.recurringEventId !== eventToDelete.id
      ));
    } else if (recurringEventId && deleteOption === "thisAndFuture") {
      const untilDate = new Date(eventToDelete.start);
      untilDate.setDate(untilDate.getDate() - 1);
      await setRecurringUntilDate(recurringEventId, untilDate, collectionName);

      setAllEvents(prev => prev.filter(event => {
        if (event.recurringEventId !== recurringEventId && event.id !== recurringEventId) return true;
        if (event.id === recurringEventId) return true;
        if (event.recurringEventId === recurringEventId && event.occurrenceIndex >= eventToDelete.occurrenceIndex) return false;
        return true;
      }));
    } else if (recurringEventId) {
      await addEventException(recurringEventId, eventToDelete.occurrenceIndex, collectionName);
      setAllEvents(prev => prev.filter(event => event.id !== eventToDelete.id));
    } else {
      await deleteEventFromFirestore(eventToDelete.id, collectionName);

      if (eventToDelete.teamsEventId && !isAvailability && !isStudentRequest) {
        try {
          await deleteTeamsMeeting(eventToDelete.teamsEventId);
          setAlertType("success");
          setAlertMessage("Teams meeting deleted successfully");
        } catch (error) {
          console.error("Failed to delete Teams meeting:", error);
          setAlertType("error");
          setAlertMessage(`Failed to delete Teams meeting: ${error.message}`);
        }
      }

      if (isAvailability) {
        setAvailabilities(prev => prev.filter(a => a.id !== eventToDelete.id));
      } else if (isStudentRequest) {
        setStudentRequests(prev => prev.filter(r => r.id !== eventToDelete.id));
      } else {
        setAllEvents(prev => prev.filter(e => e.id !== eventToDelete.id));
      }
    }

    await removeEventFromQueue(eventToDelete.id);
  } catch (error) {
    console.error("Failed to delete event:", error);
  }
};

/**
 * Handle student confirmation
 */
export const handleConfirmation = async (event, confirmed, userEmail, { setAllEvents }) => {
  const existingResponses = event.studentResponses || [];
  const updatedStudentResponses = existingResponses.filter(r => r.email !== userEmail);
  updatedStudentResponses.push({ email: userEmail, response: confirmed });

  const updatedEvent = { ...event, studentResponses: updatedStudentResponses };

  try {
    await updateEventInFirestore(event.id, { studentResponses: updatedStudentResponses });
    setAllEvents(prev => prev.map(evt => evt.id === event.id ? updatedEvent : evt));
  } catch (error) {
    console.error("Failed to update student response:", error);
  }
};

/**
 * Duplicate event
 */
export const handleEventDuplicate = async (
  event,
  { userRole, userEmail, availabilities, allEvents, setAvailabilities, setAllEvents }
) => {
  const nextDayStart = new Date(event.start);
  nextDayStart.setDate(nextDayStart.getDate() + 1);

  const nextDayEnd = new Date(event.end);
  nextDayEnd.setDate(nextDayEnd.getDate() + 1);

  // Handle tutor availability duplication
  if (event.tutor && userRole === 'tutor' && event.tutor === userEmail) {
    const availabilityData = {
      ...event,
      start: nextDayStart,
      end: nextDayEnd,
    };

    try {
      const docId = await createEventInFirestore(availabilityData, 'tutorAvailabilities');
      availabilityData.id = docId;
      setAvailabilities([...availabilities, { ...availabilityData, id: docId }]);
    } catch (error) {
      console.error('Failed to duplicate availability:', error);
    }
    return;
  }

  // Handle regular event duplication (teachers only)
  if (!event.tutor && userRole === 'teacher') {
    const eventData = {
      ...event,
      start: nextDayStart,
      end: nextDayEnd,
      tutorResponses: [],
      studentResponses: [],
    };

    try {
      const docId = await createEventInFirestore(eventData);
      eventData.id = docId;
      setAllEvents([...allEvents, { ...eventData, id: docId }]);
      await addOrUpdateEventInQueue(eventData, 'store');

      if (eventData.approvalStatus === "approved") {
        const subject = eventData.title;
        const description = eventData.description || "";
        const startTime = new Date(eventData.start).toISOString();
        const endTime = new Date(eventData.end).toISOString();
        const attendeesEmailArr = [...eventData.students, ...eventData.staff].map(p => p.value);

        await createTeamsMeeting({ ...eventData, id: docId }, subject, description, startTime, endTime, attendeesEmailArr);
      }
    } catch (error) {
      console.error('Failed to duplicate event:', error);
    }
  }
};
