import { updateEventInFirestore, createEventInFirestore, addOrUpdateEventInQueue, deleteEventFromFirestore } from '@/utils/firebaseOperations';

/**
 * Hook for handling StudentEventForm operations
 * Used by: StudentEventForm
 */
export const useStudentEventForm = (eventsData) => {

  const handleInputChange = (newEvent, setNewEvent) => (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setNewEvent({ ...newEvent, [name]: val });
  };

  const handleSubmit = (newEvent, isEditing, eventToEdit, setShowModal) => async (e) => {
    e.preventDefault();

    const eventData = {
      title: newEvent.title || '',
      start: new Date(newEvent.start),
      end: new Date(newEvent.end),
      description: newEvent.description || '',
      confirmationRequired: newEvent.confirmationRequired || false,
      staff: newEvent.staff || [],
      classes: newEvent.classes || [],
      students: newEvent.students || [],
      tutorResponses: newEvent.tutorResponses || [],
      studentResponses: newEvent.studentResponses || [],
      minStudents: newEvent.minStudents || 0,
      createdByStudent: newEvent.createdByStudent || false,
      approvalStatus: newEvent.approvalStatus || 'pending',
      workStatus: newEvent.workStatus || 'notCompleted',
      locationType: newEvent.locationType || '',
    };

    try {
      if (isEditing) {
        await updateEventInFirestore(eventToEdit.id, eventData);
        eventsData.setAllEvents(eventsData.allEvents.map(event =>
          event.id === eventToEdit.id ? { ...eventData, id: eventToEdit.id } : event
        ));
        await addOrUpdateEventInQueue({ ...eventData, id: eventToEdit.id }, 'update');
      } else {
        const docId = await createEventInFirestore(eventData);
        eventData.id = docId;
        eventsData.setAllEvents([...eventsData.allEvents, { ...eventData, id: docId }]);
        await addOrUpdateEventInQueue(eventData, 'store');
      }
      setShowModal(false);
    } catch (error) {
      console.error('Failed to submit event:', error);
    }
  };

  const handleDelete = (eventToEdit, setShowModal) => async () => {
    try {
      await deleteEventFromFirestore(eventToEdit.id);
      eventsData.setAllEvents(eventsData.allEvents.filter(
        event => event.id !== eventToEdit.id
      ));
      setShowModal(false);
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  return {
    handleInputChange,
    handleSubmit,
    handleDelete,
  };
};