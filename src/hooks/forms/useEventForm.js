import { updateEventInFirestore, createEventInFirestore, addOrUpdateEventInQueue, deleteEventFromFirestore } from '@/firestore/firebaseOperations';
import { createTeamsMeeting, updateTeamsMeeting, deleteTeamsMeeting } from '@/utils/msTeams';
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
      recurring: newEvent.recurring || null,
      createTeamsMeeting: newEvent.createTeamsMeeting || false,
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
          // Don't manually update state - let the Firestore listener handle it

          await addOrUpdateEventInQueue({ ...eventData, id: docId }, 'store');

          // Close modal immediately for better UX
          setShowModal(false);

          // Create Teams meeting if approved or checkbox is checked (in background)
          if (eventData.createTeamsMeeting) {
            const subject = eventData.title;
            const description = eventData.description || "";
            const startTime = new Date(eventData.start).toISOString();
            const endTime = new Date(eventData.end).toISOString();
            const attendeesEmailArr = [...eventData.students, ...eventData.staff].map(p => p.value);

            createTeamsMeeting(subject, description, startTime, endTime, attendeesEmailArr)
              .then((result) => {
                // Store Teams event ID in Firestore
                updateEventInFirestore(docId, {
                  teamsEventId: result.teamsEventId,
                  teamsJoinUrl: result.joinUrl
                });
                setAlertType('success');
                setAlertMessage('Teams meeting created successfully');
              })
              .catch((error) => {
                setAlertType('error');
                setAlertMessage(`Failed to create Teams meeting: ${error.message}`);
              });
          }
        } else if (eventToEdit.isStudentRequest) {
          // Student request being edited but not approved - update in studentEventRequests
          await updateEventInFirestore(eventToEdit.id, eventData, 'studentEventRequests');
          await addOrUpdateEventInQueue({ ...eventData, id: eventToEdit.id }, 'update');
          setShowModal(false);
        } else {
          // Regular event update
          await updateEventInFirestore(eventToEdit.id, eventData);
          // Don't manually update state - let the Firestore listener handle it
          await addOrUpdateEventInQueue({ ...eventData, id: eventToEdit.id }, 'update');

          // Close modal immediately for better UX
          setShowModal(false);

          // Check if checkbox is unchecked and Teams meeting exists - delete it
          if (!eventData.createTeamsMeeting && eventToEdit.teamsEventId) {
            deleteTeamsMeeting(eventToEdit.teamsEventId)
              .then(() => {
                // Remove Teams event ID from Firestore
                updateEventInFirestore(eventToEdit.id, {
                  teamsEventId: null,
                  teamsJoinUrl: null
                });
                setAlertType('success');
                setAlertMessage('Teams meeting deleted successfully');
              })
              .catch((error) => {
                setAlertType('error');
                setAlertMessage(`Failed to delete Teams meeting: ${error.message}`);
              });
          }
          // Check if event was just approved or checkbox is checked and create/update Teams meeting (in background)
          else if ((eventData.approvalStatus === "approved" && eventToEdit.approvalStatus !== "approved") || eventData.createTeamsMeeting) {
            const subject = eventData.title;
            const description = eventData.description || "";
            const startTime = new Date(eventData.start).toISOString();
            const endTime = new Date(eventData.end).toISOString();
            const attendeesEmailArr = [...eventData.students, ...eventData.staff].map(p => p.value);

            // If Teams event already exists, update it; otherwise create new one
            if (eventToEdit.teamsEventId) {
              updateTeamsMeeting(eventToEdit.teamsEventId, subject, description, startTime, endTime, attendeesEmailArr)
                .then(() => {
                  setAlertType('success');
                  setAlertMessage('Teams meeting updated successfully');
                })
                .catch((error) => {
                  setAlertType('error');
                  setAlertMessage(`Failed to update Teams meeting: ${error.message}`);
                });
            } else {
              createTeamsMeeting(subject, description, startTime, endTime, attendeesEmailArr)
                .then((result) => {
                  // Store Teams event ID in Firestore
                  updateEventInFirestore(eventToEdit.id, {
                    teamsEventId: result.teamsEventId,
                    teamsJoinUrl: result.joinUrl
                  });
                  setAlertType('success');
                  setAlertMessage('Teams meeting created successfully');
                })
                .catch((error) => {
                  setAlertType('error');
                  setAlertMessage(`Failed to create Teams meeting: ${error.message}`);
                });
            }
          }
        }
      } else {
        const docId = await createEventInFirestore(eventData);
        eventData.id = docId;
        // Don't manually update state - let the Firestore listener handle it
        // This ensures recurring events are properly expanded
        await addOrUpdateEventInQueue(eventData, 'store');

        // Close modal immediately for better UX
        setShowModal(false);

        // Create Teams meeting if event is approved on creation or checkbox is checked (in background)
        if (eventData.approvalStatus === "approved" || eventData.createTeamsMeeting) {
          const subject = eventData.title;
          const description = eventData.description || "";
          const startTime = new Date(eventData.start).toISOString();
          const endTime = new Date(eventData.end).toISOString();
          const attendeesEmailArr = [...eventData.students, ...eventData.staff].map(p => p.value);

          createTeamsMeeting(subject, description, startTime, endTime, attendeesEmailArr)
            .then((result) => {
              // Store Teams event ID in Firestore
              updateEventInFirestore(docId, {
                teamsEventId: result.teamsEventId,
                teamsJoinUrl: result.joinUrl
              });
              setAlertType('success');
              setAlertMessage('Teams meeting created successfully');
            })
            .catch((error) => {
              setAlertType('error');
              setAlertMessage(`Failed to create Teams meeting: ${error.message}`);
            });
        }
      }
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