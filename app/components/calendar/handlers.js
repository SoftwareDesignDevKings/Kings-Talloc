import { doc, updateDoc, addDoc, deleteDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase'; // updated import

export const handleSelectSlot = (slotInfo, userRole, setNewEvent, setNewAvailability, setIsEditing, setShowTeacherModal, setShowStudentModal, setShowAvailabilityModal, userEmail) => {
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
    });
    setIsEditing(false);
    setShowStudentModal(true);
    return;
  }

  if (userRole === 'tutor') {
    setNewAvailability({ title: 'Availability', start, end, tutor: userEmail });
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
    } else if (userRole === 'student') {
      setNewEvent(event);
      setIsEditing(true);
      setEventToEdit(event);
      setShowStudentModal(true);
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
  };

  if (isEditing) {
    const eventDoc = doc(db, 'events', eventToEdit.id);
    await updateDoc(eventDoc, eventData);
    setEvents(events.map(event => event.id === eventToEdit.id ? { ...eventData, id: eventToEdit.id } : event));
  } else {
    const docRef = await addDoc(collection(db, 'events'), eventData);
    setEvents([...events, { ...eventData, id: docRef.id }]);
  }
  setShowModal(false);
};

export const handleDelete = async (eventToEdit, events, setEvents, availabilities, setAvailabilities, setShowModal) => {
  if (eventToEdit && eventToEdit.id) {
    const collectionName = eventToEdit.tutor ? 'availabilities' : 'events';
    await deleteDoc(doc(db, collectionName, eventToEdit.id));
    if (collectionName === 'availabilities') {
      setAvailabilities(availabilities.filter(availability => availability.id !== eventToEdit.id));
    } else {
      setEvents(events.filter(event => event.id !== eventToEdit.id));
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
  if (isEditing) {
    const availabilityDoc = doc(db, 'availabilities', eventToEdit.id);
    await updateDoc(availabilityDoc, {
      title: newAvailability.title,
      start: new Date(newAvailability.start),
      end: new Date(newAvailability.end),
      tutor: newAvailability.tutor,
    });
    setAvailabilities(availabilities.map(availability => availability.id === eventToEdit.id ? { ...newAvailability, id: eventToEdit.id } : availability));
  } else {
    const docRef = await addDoc(collection(db, 'availabilities'), {
      title: newAvailability.title,
      start: new Date(newAvailability.start),
      end: new Date(newAvailability.end),
      tutor: newAvailability.tutor,
    });
    setAvailabilities([...availabilities, { ...newAvailability, id: docRef.id }]);
  }
  setShowAvailabilityModal(false);
};

export const handleConfirmation = async (event, confirmed, userRole, userEmail, events, setEvents) => {
  if (userRole === 'tutor') {
    const updatedTutorResponses = [
      ...event.tutorResponses.filter(response => response.email !== userEmail),
      { email: userEmail, response: confirmed },
    ];
    const updatedEvent = { ...event, tutorResponses: updatedTutorResponses };
    const eventDoc = doc(db, 'events', event.id);
    await updateDoc(eventDoc, {
      tutorResponses: updatedTutorResponses,
    });
    setEvents(events.map(evt => evt.id === event.id ? updatedEvent : evt));
  } else if (userRole === 'student' && event.minStudents > 0) {
    const updatedStudentResponses = [
      ...event.studentResponses.filter(response => response.email !== userEmail),
      { email: userEmail, response: confirmed },
    ];
    const updatedEvent = { ...event, studentResponses: updatedStudentResponses };
    const eventDoc = doc(db, 'events', event.id);
    await updateDoc(eventDoc, {
      studentResponses: updatedStudentResponses,
    });
    setEvents(events.map(evt => evt.id === event.id ? updatedEvent : evt));
  }
};
