import { doc, updateDoc, addDoc, deleteDoc, collection, setDoc } from 'firebase/firestore';
import { db } from '../../firebase'; // Adjust the path as necessary

// Firestore operations for events queue

const addOrUpdateEventInQueue = async (event, action) => {
  try {
    const eventDoc = doc(db, 'eventsQueue', event.id);
    await setDoc(eventDoc, {
      ...event,
      timestamp: new Date(),
    });
    return { message: `Event ${action}d successfully in queue` };
  } catch (error) {
    console.error(`Error during ${action} event in queue:`, error);
    throw new Error(`Failed to ${action} event in queue`);
  }
};

const removeEventFromQueue = async (id) => {
  try {
    const eventDoc = doc(db, 'eventsQueue', id);
    await deleteDoc(eventDoc);
    return { message: 'Event removed successfully from queue' };
  } catch (error) {
    console.error('Error removing event from queue:', error);
    throw new Error('Failed to remove event from queue');
  }
};

// Handlers for managing events

export const handleSelectSlot = (
  slotInfo,
  userRole,
  setNewEvent,
  setNewAvailability,
  setIsEditing,
  setShowTeacherModal,
  setShowStudentModal,
  setShowAvailabilityModal,
  userEmail
) => {
  const start = slotInfo.start;
  const end = slotInfo.end;

  if (userRole === 'student') {
    setNewEvent({
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
      locationType: '', // Add locationType to the initial state
    });
    setIsEditing(false);
    setShowStudentModal(true);
    return;
  }

  if (userRole === 'tutor') {
    setNewAvailability({ title: 'Availability', start, end, tutor: userEmail, workType: 'tutoringOrWork', locationType: '' }); // Add workType and locationType to the initial state
    setIsEditing(false);
    setShowAvailabilityModal(true);
  } else {
    setNewEvent({
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
      locationType: '', // Add locationType to the initial state
    });
    setIsEditing(false);
    setShowTeacherModal(true);
  }
};

export const handleSelectEvent = (event, userRole, userEmail, setNewEvent, setNewAvailability, setIsEditing, setEventToEdit, setShowTeacherModal, setShowStudentModal, setShowAvailabilityModal, setShowDetailsModal) => {
  if (event.tutor) {
    if (userRole === 'tutor' && event.tutor === userEmail) {
      setNewAvailability(event);
      setIsEditing(true);
      setEventToEdit(event);
      setShowAvailabilityModal(true);
    } else {
      setEventToEdit(event);
      setShowDetailsModal(true);
    }
  } else {
    if (userRole === 'teacher') {
      setNewEvent(event);
      setIsEditing(true);
      setEventToEdit(event);
      setShowTeacherModal(true);
    } else if (userRole === 'student' && event.createdByStudent) {
      if (event.approvalStatus === 'pending') {
        setNewEvent(event);
        setIsEditing(true);
        setEventToEdit(event);
        setShowStudentModal(true);
      } else {
        setEventToEdit(event);
        setShowDetailsModal(true);
      }
    } else {
      setEventToEdit(event);
      setShowDetailsModal(true);
    }
  }
};

export const handleEventDrop = async ({ event, start, end }, events, availabilities, setEvents, setAvailabilities, userRole) => {
  const isAvailability = !!event.tutor;

  if (userRole === 'student' || (userRole === 'tutor' && !isAvailability)) return;

  const duration = (event.end - event.start);
  const updatedEnd = new Date(start.getTime() + duration);

  const updatedEvent = { ...event, start, end: updatedEnd };
  const previousEvents = [...events];
  const previousAvailabilities = [...availabilities];

  if (isAvailability) {
    setAvailabilities(availabilities.map(avail => avail.id === event.id ? updatedEvent : avail));
  } else {
    setEvents(events.map(evt => evt.id === event.id ? updatedEvent : evt));
  }

  try {
    const eventDoc = doc(db, isAvailability ? 'availabilities' : 'events', event.id);
    await updateDoc(eventDoc, {
      start: new Date(start),
      end: updatedEnd,
    });
  } catch (error) {
    console.error('Failed to update event:', error);
    if (isAvailability) {
      setAvailabilities(previousAvailabilities);
    } else {
      setEvents(previousEvents);
    }
  }
};

export const handleEventResize = async ({ event, start, end }, events, availabilities, setEvents, setAvailabilities, userRole) => {
  const isAvailability = !!event.tutor;

  if (userRole === 'student' || (userRole === 'tutor' && !isAvailability)) return;

  const updatedEvent = { ...event, start, end };
  const previousEvents = [...events];
  const previousAvailabilities = [...availabilities];

  if (isAvailability) {
    setAvailabilities(availabilities.map(avail => avail.id === event.id ? updatedEvent : avail));
  } else {
    setEvents(events.map(evt => evt.id === event.id ? updatedEvent : evt));
  }

  try {
    const eventDoc = doc(db, isAvailability ? 'availabilities' : 'events', event.id);
    await updateDoc(eventDoc, {
      start: new Date(start),
      end: new Date(end),
    });
  } catch (error) {
    console.error('Failed to update event:', error);
    if (isAvailability) {
      setAvailabilities(previousAvailabilities);
    } else {
      setEvents(previousEvents);
    }
  }
};

export const handleInputChange = (e, setNewEvent, newEvent) => {
  const { name, value, type, checked } = e.target;
  const val = type === 'checkbox' ? checked : value;
  setNewEvent({ ...newEvent, [name]: val });
};

export const handleLocationChange = (selectedOption, setNewEvent, newEvent) => {
  setNewEvent({ ...newEvent, locationType: selectedOption.value });
};

export const handleSubmit = async (e, isEditing, newEvent, eventToEdit, setEvents, events, setShowModal) => {
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
    locationType: newEvent.locationType || '', // Include locationType in eventData
  };

  try {
    if (isEditing) {
      const eventDoc = doc(db, 'events', eventToEdit.id);
      await updateDoc(eventDoc, eventData);
      setEvents(events.map(event => event.id === eventToEdit.id ? { ...eventData, id: eventToEdit.id } : event));
      await addOrUpdateEventInQueue({ ...eventData, id: eventToEdit.id }, 'update');
    } else {
      const docRef = await addDoc(collection(db, 'events'), eventData);
      eventData.id = docRef.id; // Add the generated ID to the event data
      setEvents([...events, { ...eventData, id: docRef.id }]);
      await addOrUpdateEventInQueue(eventData, 'store');
    }
    setShowModal(false);
  } catch (error) {
    console.error('Failed to submit event:', error);
  }
};

export const handleDelete = async (eventToEdit, events, setEvents, availabilities, setAvailabilities, setShowModal) => {
  if (eventToEdit && eventToEdit.id) {
    const collectionName = eventToEdit.tutor ? 'availabilities' : 'events';
    try {
      await deleteDoc(doc(db, collectionName, eventToEdit.id));
      if (collectionName === 'availabilities') {
        setAvailabilities(availabilities.filter(availability => availability.id !== eventToEdit.id));
      } else {
        setEvents(events.filter(event => event.id !== eventToEdit.id));
      }
      await removeEventFromQueue(eventToEdit.id);
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  }
  setShowModal(false);
};

export const handleStaffChange = (selectedStaff, setNewEvent, newEvent) => {
  setNewEvent({ ...newEvent, staff: selectedStaff });
};

export const handleClassChange = (selectedClasses, setNewEvent, newEvent) => {
  setNewEvent({ ...newEvent, classes: selectedClasses });
};

export const handleStudentChange = (selectedStudents, setNewEvent, newEvent) => {
  setNewEvent({ ...newEvent, students: selectedStudents });
};

export const handleAvailabilityChange = (e, setNewAvailability, newAvailability) => {
  const { name, value } = e.target;
  setNewAvailability({ ...newAvailability, [name]: value });
};

export const handleAvailabilitySubmit = async (e, isEditing, newAvailability, eventToEdit, setAvailabilities, availabilities, setShowAvailabilityModal) => {
  e.preventDefault();
  const availabilityData = {
    title: newAvailability.title,
    start: new Date(newAvailability.start),
    end: new Date(newAvailability.end),
    tutor: newAvailability.tutor,
    workType: newAvailability.workType,
    locationType: newAvailability.locationType, // Include locationType in availabilityData
  };

  try {
    if (isEditing) {
      const availabilityDoc = doc(db, 'availabilities', eventToEdit.id);
      await updateDoc(availabilityDoc, availabilityData);
      setAvailabilities(availabilities.map(availability => availability.id === eventToEdit.id ? { ...availabilityData, id: eventToEdit.id } : availability));
    } else {
      const docRef = await addDoc(collection(db, 'availabilities'), availabilityData);
      setAvailabilities([...availabilities, { ...availabilityData, id: docRef.id }]);
    }
    setShowAvailabilityModal(false);
  } catch (error) {
    console.error('Failed to submit availability:', error);
  }
};

export const handleConfirmation = async (event, confirmed, userRole, userEmail, events, setEvents) => {
  if (userRole === 'student' && event.minStudents > 0) {
    const updatedStudentResponses = [
      ...(event.studentResponses || []).filter(response => response.email !== userEmail),
      { email: userEmail, response: confirmed },
    ];
    const updatedEvent = { ...event, studentResponses: updatedStudentResponses };
    const eventDoc = doc(db, 'events', event.id);

    try {
      await updateDoc(eventDoc, {
        studentResponses: updatedStudentResponses,
      });
      setEvents(events.map(evt => (evt.id === event.id ? updatedEvent : evt)));
    } catch (error) {
      console.error('Failed to update student response:', error);
    }
  }
};
