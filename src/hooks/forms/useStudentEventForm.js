import { updateEventInFirestore, createEventInFirestore, addOrUpdateEventInQueue, deleteEventFromFirestore } from '@/firestore/firebaseOperations';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firestore/clientFirestore';

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
      subject: newEvent.subject || null,
      preference: newEvent.preference || null,
    };

    try {
      if (isEditing) {
        // Update student request (not approved event)
        const requestRef = doc(db, 'studentEventRequests', eventToEdit.id);
        await setDoc(requestRef, eventData);
        await addOrUpdateEventInQueue({ ...eventData, id: eventToEdit.id }, 'update');
      } else {
        // Create new student request (not approved event)
        const requestRef = doc(db, 'studentEventRequests', Date.now().toString());
        eventData.id = requestRef.id;
        await setDoc(requestRef, eventData);
        await addOrUpdateEventInQueue(eventData, 'store');
      }
      setShowModal(false);
    } catch (error) {
      console.error('Failed to submit student request:', error);
    }
  };

  const handleDelete = (eventToEdit, setShowModal) => async () => {
    try {
      // Delete from studentEventRequests collection
      await deleteDoc(doc(db, 'studentEventRequests', eventToEdit.id));
      setShowModal(false);
    } catch (error) {
      console.error('Failed to delete student request:', error);
    }
  };

  return {
    handleInputChange,
    handleSubmit,
    handleDelete,
  };
};