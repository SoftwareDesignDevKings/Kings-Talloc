import { useAvailabilityOperations } from './useAvailabilityOperations';

/**
 * Hook for handling TutorAvailabilityForm operations
 * Used by: TutorAvailabilityForm
 */
export const useTutorAvailabilityForm = (eventsData) => {
  const { submitAvailability, deleteAvailability } = useAvailabilityOperations(eventsData);

  const handleInputChange = (newAvailability, setNewAvailability) => (e) => {
    const { name, value } = e.target;
    setNewAvailability({ ...newAvailability, [name]: value });
  };

  const handleSubmit = (newAvailability, isEditing, eventToEdit, setShowModal) => async (e) => {
    e.preventDefault();

    const availabilityData = {
      title: newAvailability.title,
      start: new Date(newAvailability.start),
      end: new Date(newAvailability.end),
      tutor: newAvailability.tutor,
      workType: newAvailability.workType,
      locationType: newAvailability.locationType,
    };

    try {
      await submitAvailability(availabilityData, isEditing, eventToEdit);
      setShowModal(false);
    } catch (error) {
      console.error('Failed to submit availability:', error);
    }
  };

  const handleDelete = (eventToEdit, setShowModal) => async () => {
    try {
      await deleteAvailability(eventToEdit);
      setShowModal(false);
    } catch (error) {
      console.error('Failed to delete availability:', error);
    }
  };

  return {
    handleInputChange,
    handleSubmit,
    handleDelete,
  };
};