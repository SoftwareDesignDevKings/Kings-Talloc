import { updateEventInFirestore, createEventInFirestore, addOrUpdateEventInQueue, deleteEventFromFirestore } from '@/firestore/firebaseOperations';
import { createTeamsMeeting } from '@/utils/msTeams';
import useAlert from '../useAlert';

/**
 * Hook for handling EventForm (teacher) operations
 * Used by: EventForm
 */
export const useEventForm = (eventsData) => {
  const { setAlertMessage, setAlertType } = useAlert();

  const handleInputChange = (newEvent, setNewEvent) => (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setNewEvent({ ...newEvent, [name]: val });
  };

  const handleLocationChange = (newEvent, setNewEvent) => (selectedOption) => {
    setNewEvent({ ...newEvent, locationType: selectedOption.value });
  };

  const handleStaffChange = (newEvent, setNewEvent) => (selectedStaff) => {
    setNewEvent({ ...newEvent, staff: selectedStaff });
  };

  const handleClassChange = (newEvent, setNewEvent) => (selectedClasses) => {
    setNewEvent({ ...newEvent, classes: selectedClasses });
  };

  const handleStudentChange = (newEvent, setNewEvent) => (selectedStudents) => {
    setNewEvent({ ...newEvent, students: selectedStudents });
  };

  const handleSubmit = (newEvent, isEditing, eventToEdit, setShowModal) => async (e) => {
    e.preventDefault();

    // Validate title is provided
    if (!newEvent.title) {
      setAlertType('error');
      setAlertMessage(('Title is required'));
      return;
    }

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
      workType: newEvent.workType || 'tutoring',
      locationType: newEvent.locationType || '',
      subject: newEvent.subject || null,
      preference: newEvent.preference || null,
    };

    try {
      if (isEditing) {
        console.log('DEBUG: Editing event', {
          isStudentRequest: eventToEdit.isStudentRequest,
          approvalStatus: eventData.approvalStatus,
          eventToEdit
        });

        // If this is a student request being approved, move it from studentEventRequests to events
        if (eventToEdit.isStudentRequest && eventData.approvalStatus === "approved") {
          console.log('DEBUG: Approving student request - moving to events collection');
          // Delete from studentEventRequests
          await deleteEventFromFirestore(eventToEdit.id, 'studentEventRequests');

          // Create in events collection (approved event)
          const docId = await createEventInFirestore(eventData);
          eventData.id = docId;
          eventsData.setAllEvents([...eventsData.allEvents.filter(e => e.id !== eventToEdit.id), { ...eventData, id: docId }]);

          await addOrUpdateEventInQueue({ ...eventData, id: docId }, 'store');

          // Create Teams meeting
          const subject = eventData.title;
          const description = eventData.description || "";
          const startTime = new Date(eventData.start).toISOString();
          const endTime = new Date(eventData.end).toISOString();
          const attendeesEmailArr = [...eventData.students, ...eventData.staff].map(p => p.value);

          await createTeamsMeeting({ ...eventData, id: docId }, subject, description, startTime, endTime, attendeesEmailArr);
        } else if (eventToEdit.isStudentRequest) {
          // Student request being edited but not approved - update in studentEventRequests
          await updateEventInFirestore(eventToEdit.id, eventData, 'studentEventRequests');
          await addOrUpdateEventInQueue({ ...eventData, id: eventToEdit.id }, 'update');
        } else {
          // Regular event update
          await updateEventInFirestore(eventToEdit.id, eventData);
          eventsData.setAllEvents(eventsData.allEvents.map(event =>
            event.id === eventToEdit.id ? { ...eventData, id: eventToEdit.id } : event
          ));
          await addOrUpdateEventInQueue({ ...eventData, id: eventToEdit.id }, 'update');

          // Check if event was just approved and create Teams meeting
          if (eventData.approvalStatus === "approved" && eventToEdit.approvalStatus !== "approved") {
            const subject = eventData.title;
            const description = eventData.description || "";
            const startTime = new Date(eventData.start).toISOString();
            const endTime = new Date(eventData.end).toISOString();
            const attendeesEmailArr = [...eventData.students, ...eventData.staff].map(p => p.value);

            await createTeamsMeeting({ ...eventData, id: eventToEdit.id }, subject, description, startTime, endTime, attendeesEmailArr);
          }
        }
      } else {
        const docId = await createEventInFirestore(eventData);
        eventData.id = docId;
        eventsData.setAllEvents([...eventsData.allEvents, { ...eventData, id: docId }]);
        await addOrUpdateEventInQueue(eventData, 'store');

        // Create Teams meeting if event is approved on creation
        if (eventData.approvalStatus === "approved") {
          const subject = eventData.title;
          const description = eventData.description || "";
          const startTime = new Date(eventData.start).toISOString();
          const endTime = new Date(eventData.end).toISOString();
          const attendeesEmailArr = [...eventData.students, ...eventData.staff].map(p => p.value);

          await createTeamsMeeting({ ...eventData, id: docId }, subject, description, startTime, endTime, attendeesEmailArr);
        }
      }
      setShowModal(false);
    } catch (error) {
      console.error('Failed to submit event:', error);
    }
  };

  return {
    handleInputChange,
    handleLocationChange,
    handleStaffChange,
    handleClassChange,
    handleStudentChange,
    handleSubmit,
  };
};