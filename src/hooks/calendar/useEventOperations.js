import { updateEventInFirestore, createEventInFirestore, deleteEventFromFirestore, addOrUpdateEventInQueue, removeEventFromQueue } from '@/utils/firebaseOperations';

/**
 * Hook for handling event CRUD operations and drag/drop
 * Used by: CalendarWrapper, EventForm, StudentEventForm
 */
export const useEventOperations = (eventsData, userRole, userEmail) => {

  const handleEventDrop = async ({ event, start, end }) => {
    const isAvailability = !!event.tutor;

    if (userRole === 'student' || (userRole === 'tutor' && !isAvailability)) return;

    const duration = (event.end - event.start);
    const updatedEnd = new Date(start.getTime() + duration);

    const updatedEvent = { ...event, start, end: updatedEnd };
    const previousEvents = [...eventsData.allEvents];
    const previousAvailabilities = [...eventsData.availabilities];

    if (isAvailability) {
      eventsData.setAvailabilities(eventsData.availabilities.map(avail =>
        avail.id === event.id ? updatedEvent : avail
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
      }, isAvailability ? 'availabilities' : 'events');
    } catch (error) {
      console.error('Failed to update event:', error);
      if (isAvailability) {
        eventsData.setAvailabilities(previousAvailabilities);
      } else {
        eventsData.setAllEvents(previousEvents);
      }
    }
  };

  const handleEventResize = async ({ event, start, end }) => {
    const isAvailability = !!event.tutor;

    if (userRole === 'student' || (userRole === 'tutor' && !isAvailability)) {
      return;
    }

    const updatedEvent = { ...event, start, end };
    const previousEvents = [...eventsData.allEvents];
    const previousAvailabilities = [...eventsData.availabilities];

    if (isAvailability) {
      eventsData.setAvailabilities(eventsData.availabilities.map(avail =>
        avail.id === event.id ? updatedEvent : avail
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
      }, isAvailability ? 'availabilities' : 'events');

      if (!isAvailability && !event.createdByStudent && event.approvalStatus === "approved") {
        // TODO: add the updateTeamsMeeting func
      }

    } catch (error) {
      console.error('Failed to update event:', error);
      if (isAvailability) {
        eventsData.setAvailabilities(previousAvailabilities);
      } else {
        eventsData.setAllEvents(previousEvents);
      }
    }
  };

  const handleDeleteEvent = async (eventToEdit, modals) => {
    if (eventToEdit && eventToEdit.id) {
      const collectionName = eventToEdit.tutor ? 'availabilities' : 'events';
      try {
        await deleteEventFromFirestore(eventToEdit.id, collectionName);
        if (collectionName === 'availabilities') {
          eventsData.setAvailabilities(eventsData.availabilities.filter(availability =>
            availability.id !== eventToEdit.id
          ));
        } else {
          eventsData.setAllEvents(eventsData.allEvents.filter(event =>
            event.id !== eventToEdit.id
          ));
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