import { updateEventInFirestore, createEventInFirestore, deleteEventFromFirestore, addEventException, setRecurringUntilDate, removeEventFromQueue } from '@/firestore/firebaseOperations';
import { updateTeamsMeeting, deleteTeamsMeeting } from '@/utils/msTeams';
import useAlert from '../useAlert';

/**
 * Hook for handling event CRUD operations and drag/drop
 * Used by: CalendarWrapper, EventForm, StudentEventForm
 */
export const useEventOperations = (eventsData, userRole, userEmail) => {
  const { setAlertMessage, setAlertType } = useAlert();

  const handleEventDrop = async ({ event, start, end }) => {
    const isAvailability = !!event.tutor;
    const isStudentRequest = !!event.isStudentRequest;

    // Students can only drag their own student requests
    if (userRole === 'student') {
      if (!isStudentRequest) return; // Can't drag approved events
      // Check if student owns this request
      const isOwnRequest = event.students?.some(s => s.value === userEmail || s === userEmail);
      if (!isOwnRequest) return;
    }

    // Tutors can only drag their own availabilities
    if (userRole === 'tutor' && !isAvailability) return;

    const duration = (event.end - event.start);
    const updatedEnd = new Date(start.getTime() + duration);

    const updatedEvent = { ...event, start, end: updatedEnd };
    const previousEvents = [...eventsData.allEvents];
    const previousAvailabilities = [...eventsData.availabilities];
    const previousStudentRequests = [...eventsData.studentRequests];

    // Determine which collection to update
    let collectionName = 'events';
    if (isAvailability) {
      collectionName = 'tutorAvailabilities';
      eventsData.setAvailabilities(eventsData.availabilities.map(avail =>
        avail.id === event.id ? updatedEvent : avail
      ));
    } else if (isStudentRequest) {
      collectionName = 'studentEventRequests';
      eventsData.setStudentRequests(eventsData.studentRequests.map(req =>
        req.id === event.id ? updatedEvent : req
      ));
    } else {
      eventsData.setAllEvents(eventsData.allEvents.map(evt =>
        evt.id === event.id ? updatedEvent : evt
      ));
    }

    try {
      await updateEventInFirestore(event.id, {
        start: new Date(start),
        end: updatedEnd,
      }, collectionName);

      // Update Teams meeting if it exists
      if (event.teamsEventId && !isAvailability && !isStudentRequest) {
        const subject = event.title;
        const description = event.description || "";
        const startTime = new Date(start).toISOString();
        const endTime = new Date(updatedEnd).toISOString();
        const attendeesEmailArr = [...(event.students || []), ...(event.staff || [])].map(p => p.value || p);

        updateTeamsMeeting(event.teamsEventId, subject, description, startTime, endTime, attendeesEmailArr)
          .then(() => {
            setAlertType('success');
            setAlertMessage('Teams meeting updated successfully');
          })
          .catch((error) => {
            console.error('Failed to update Teams meeting:', error);
            setAlertType('error');
            setAlertMessage(`Failed to update Teams meeting: ${error.message}`);
          });
      }
    } catch (error) {
      console.error('Failed to update event:', error);
      if (isAvailability) {
        eventsData.setAvailabilities(previousAvailabilities);
      } else if (isStudentRequest) {
        eventsData.setStudentRequests(previousStudentRequests);
      } else {
        eventsData.setAllEvents(previousEvents);
      }
    }
  };

  const handleEventResize = async ({ event, start, end }) => {
    const isAvailability = !!event.tutor;
    const isStudentRequest = !!event.isStudentRequest;

    // Students can only resize their own student requests
    if (userRole === 'student') {
      if (!isStudentRequest) return; // Can't resize approved events
      // Check if student owns this request
      const isOwnRequest = event.students?.some(s => s.value === userEmail || s === userEmail);
      if (!isOwnRequest) return;
    }

    // Tutors can only resize their own availabilities
    if (userRole === 'tutor' && !isAvailability) {
      return;
    }

    const updatedEvent = { ...event, start, end };
    const previousEvents = [...eventsData.allEvents];
    const previousAvailabilities = [...eventsData.availabilities];
    const previousStudentRequests = [...eventsData.studentRequests];

    // Determine which collection to update
    let collectionName = 'events';
    if (isAvailability) {
      collectionName = 'tutorAvailabilities';
      eventsData.setAvailabilities(eventsData.availabilities.map(avail =>
        avail.id === event.id ? updatedEvent : avail
      ));
    } else if (isStudentRequest) {
      collectionName = 'studentEventRequests';
      eventsData.setStudentRequests(eventsData.studentRequests.map(req =>
        req.id === event.id ? updatedEvent : req
      ));
    } else {
      eventsData.setAllEvents(eventsData.allEvents.map(evt =>
        evt.id === event.id ? updatedEvent : evt
      ));
    }

    try {
      await updateEventInFirestore(event.id, {
        start: new Date(start),
        end: new Date(end),
      }, collectionName);

      // Update Teams meeting if it exists
      if (event.teamsEventId && !isAvailability && !isStudentRequest) {
        const subject = event.title;
        const description = event.description || "";
        const startTime = new Date(start).toISOString();
        const endTime = new Date(end).toISOString();
        const attendeesEmailArr = [...(event.students || []), ...(event.staff || [])].map(p => p.value || p);

        updateTeamsMeeting(event.teamsEventId, subject, description, startTime, endTime, attendeesEmailArr)
          .then(() => {
            setAlertType('success');
            setAlertMessage('Teams meeting updated successfully');
          })
          .catch((error) => {
            console.error('Failed to update Teams meeting:', error);
            setAlertType('error');
            setAlertMessage(`Failed to update Teams meeting: ${error.message}`);
          });
      }

    } catch (error) {
      console.error('Failed to update event:', error);
      if (isAvailability) {
        eventsData.setAvailabilities(previousAvailabilities);
      } else if (isStudentRequest) {
        eventsData.setStudentRequests(previousStudentRequests);
      } else {
        eventsData.setAllEvents(previousEvents);
      }
    }
  };

  const handleDeleteEvent = async (eventToEdit, modals, deleteOption = 'this') => {
    if (eventToEdit && eventToEdit.id) {
      const isAvailability = !!eventToEdit.tutor;
      const isStudentRequest = !!eventToEdit.isStudentRequest;
      const recurringEventId = eventToEdit.recurringEventId; // If this exists, it's a recurring instance
      const hasRecurring = !!eventToEdit.recurring; // If this exists, it's the original recurring event

      let collectionName = 'events';
      if (isAvailability) {
        collectionName = 'tutorAvailabilities';
      } else if (isStudentRequest) {
        collectionName = 'studentEventRequests';
      }

      try {
        // Case 1: Deleting original recurring event - delete all instances
        if (hasRecurring && deleteOption === 'all') {
          console.log('[handleDeleteEvent] Deleting recurring event:', eventToEdit.id);

          // Just delete the original event - no instances are persisted
          await deleteEventFromFirestore(eventToEdit.id, collectionName);

          // Remove from email queue
          await removeEventFromQueue(eventToEdit.id);

          // Optimistically update state immediately - remove original and all expanded instances
          const newEvents = eventsData.allEvents.filter(event =>
            event.id !== eventToEdit.id && event.recurringEventId !== eventToEdit.id
          );
          console.log('[handleDeleteEvent] Updating state, new count:', newEvents.length);
          eventsData.setAllEvents(newEvents);
        }
        // Case 2: Deleting this and all future occurrences - set until date
        else if (recurringEventId && deleteOption === 'thisAndFuture') {
          const untilDate = new Date(eventToEdit.start);
          untilDate.setDate(untilDate.getDate() - 1); // Set to day before this occurrence

          await setRecurringUntilDate(recurringEventId, untilDate, collectionName);

          // Optimistically update state immediately - remove future instances
          eventsData.setAllEvents(eventsData.allEvents.filter(event => {
            // Keep non-recurring events
            if (event.recurringEventId !== recurringEventId && event.id !== recurringEventId) {
              return true;
            }
            // Keep original event (with updated until date)
            if (event.id === recurringEventId) {
              return true;
            }
            // Remove instances from this occurrence onwards
            if (event.recurringEventId === recurringEventId && event.occurrenceIndex >= eventToEdit.occurrenceIndex) {
              return false;
            }
            return true;
          }));
        }
        // Case 3: Deleting a single recurring instance - add to exceptions
        else if (recurringEventId) {
          await addEventException(recurringEventId, eventToEdit.occurrenceIndex, collectionName);

          // Optimistically update state immediately - remove this instance
          eventsData.setAllEvents(eventsData.allEvents.filter(event =>
            event.id !== eventToEdit.id
          ));
        }
        // Case 4: Deleting a normal non-recurring event
        else {
          await deleteEventFromFirestore(eventToEdit.id, collectionName);

          // Delete Teams meeting if it exists
          if (eventToEdit.teamsEventId && !isAvailability && !isStudentRequest) {
            deleteTeamsMeeting(eventToEdit.teamsEventId)
              .then(() => {
                setAlertType('success');
                setAlertMessage('Teams meeting deleted successfully');
              })
              .catch((error) => {
                console.error('Failed to delete Teams meeting:', error);
                setAlertType('error');
                setAlertMessage(`Failed to delete Teams meeting: ${error.message}`);
              });
          }

          if (isAvailability) {
            eventsData.setAvailabilities(eventsData.availabilities.filter(availability =>
              availability.id !== eventToEdit.id
            ));
          } else if (isStudentRequest) {
            eventsData.setStudentRequests(eventsData.studentRequests.filter(request =>
              request.id !== eventToEdit.id
            ));
          } else {
            eventsData.setAllEvents(eventsData.allEvents.filter(event =>
              event.id !== eventToEdit.id
            ));
          }
        }

        await removeEventFromQueue(eventToEdit.id);
      } catch (error) {
        console.error('Failed to delete event:', error);
      }
    }
    modals.setShowTeacherModal(false);
    modals.setShowStudentModal(false);
    modals.setShowAvailabilityModal(false);
  };

  const handleConfirmation = async (event, confirmed) => {
    if (userRole === 'student' && event.minStudents > 0) {
      const updatedStudentResponses = [
        ...(event.studentResponses || []).filter(response => response.email !== userEmail),
        { email: userEmail, response: confirmed },
      ];
      const updatedEvent = { ...event, studentResponses: updatedStudentResponses };

      try {
        await updateEventInFirestore(event.id, {
          studentResponses: updatedStudentResponses,
        });
        eventsData.setAllEvents(eventsData.allEvents.map(evt => (evt.id === event.id ? updatedEvent : evt)));
      } catch (error) {
        console.error('Failed to update student response:', error);
      }
    }
  };

  return {
    handleEventDrop,
    handleEventResize,
    handleDeleteEvent,
    handleConfirmation,
  };
};