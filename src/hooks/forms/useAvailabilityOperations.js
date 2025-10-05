import { updateEventInFirestore, createEventInFirestore, deleteEventFromFirestore } from '@/firestore/firebaseOperations';

/**
 * Hook for handling availability CRUD operations
 * Used by: TutorAvailabilityForm
 */
export const useAvailabilityOperations = (eventsData) => {

  const submitAvailability = async (availabilityData, isEditing, eventToEdit) => {
    try {
      if (isEditing) {
        await updateEventInFirestore(eventToEdit.id, availabilityData, 'tutorAvailabilities');
        eventsData.setAvailabilities(eventsData.availabilities.map(availability =>
          availability.id === eventToEdit.id ? { ...availabilityData, id: eventToEdit.id } : availability
        ));
      } else {
        const docId = await createEventInFirestore(availabilityData, 'tutorAvailabilities');
        eventsData.setAvailabilities([...eventsData.availabilities, { ...availabilityData, id: docId }]);
      }
    } catch (error) {
      console.error('Failed to submit availability:', error);
      throw error;
    }
  };

  const deleteAvailability = async (eventToEdit) => {
    try {
      await deleteEventFromFirestore(eventToEdit.id, 'tutorAvailabilities');
      eventsData.setAvailabilities(eventsData.availabilities.filter(
        availability => availability.id !== eventToEdit.id
      ));
    } catch (error) {
      console.error('Failed to delete availability:', error);
      throw error;
    }
  };

  return {
    submitAvailability,
    deleteAvailability,
  };
};