"use client";

import { useState } from 'react';
import { doc, updateDoc, addDoc, deleteDoc, collection, setDoc } from 'firebase/firestore';
import { db } from '@firebase/db';

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

/**
 * Custom hook for calendar event and form handlers
 */
export const useCalendarHandlers = (userRole, userEmail, modals, eventsData) => {
  const [newEvent, setNewEvent] = useState({});
  const [newAvailability, setNewAvailability] = useState({});

  // Slot selection handler
  const handleSelectSlot = (slotInfo) => {
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
        locationType: '',
      });
      modals.setIsEditing(false);
      modals.setShowStudentModal(true);
      return;
    }

    if (userRole === 'tutor') {
      setNewAvailability({
        title: 'Availability',
        start,
        end,
        tutor: userEmail,
        workType: 'tutoringOrWork',
        locationType: ''
      });
      modals.setIsEditing(false);
      modals.setShowAvailabilityModal(true);
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
        locationType: '',
      });
      modals.setIsEditing(false);
      modals.setShowTeacherModal(true);
    }
  };

  // Event selection handler
  const handleSelectEvent = (event) => {
    if (event.tutor) {
      if (userRole === 'tutor' && event.tutor === userEmail) {
        setNewAvailability(event);
        modals.setIsEditing(true);
        modals.setEventToEdit(event);
        modals.setShowAvailabilityModal(true);
      } else {
        modals.setEventToEdit(event);
        modals.setShowDetailsModal(true);
      }
    } else {
      if (userRole === 'teacher') {
        setNewEvent(event);
        modals.setIsEditing(true);
        modals.setEventToEdit(event);
        modals.setShowTeacherModal(true);
      } else if (userRole === 'student' && event.createdByStudent) {
        if (event.approvalStatus === 'pending') {
          setNewEvent(event);
          modals.setIsEditing(true);
          modals.setEventToEdit(event);
          modals.setShowStudentModal(true);
        } else {
          modals.setEventToEdit(event);
          modals.setShowDetailsModal(true);
        }
      } else {
        modals.setEventToEdit(event);
        modals.setShowDetailsModal(true);
      }
    }
  };

  // Event drag and drop handler
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
      const eventDoc = doc(db, isAvailability ? 'availabilities' : 'events', event.id);
      await updateDoc(eventDoc, {
        start: new Date(start),
        end: updatedEnd,
      });
    } catch (error) {
      console.error('Failed to update event:', error);
      if (isAvailability) {
        eventsData.setAvailabilities(previousAvailabilities);
      } else {
        eventsData.setAllEvents(previousEvents);
      }
    }
  };

  // Event resize handler
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
      const newStartTime = new Date(start);
      const newEndTime = new Date(end);

      const eventDoc = doc(db, isAvailability ? 'availabilities' : 'events', event.id);
      await updateDoc(eventDoc, {
        start: newStartTime,
        end: newEndTime,
      });

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

  // Form input change handlers
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setNewEvent({ ...newEvent, [name]: val });
  };

  const handleLocationChange = (selectedOption) => {
    setNewEvent({ ...newEvent, locationType: selectedOption.value });
  };

  const handleStaffChange = (selectedStaff) => {
    setNewEvent({ ...newEvent, staff: selectedStaff });
  };

  const handleClassChange = (selectedClasses) => {
    setNewEvent({ ...newEvent, classes: selectedClasses });
  };

  const handleStudentChange = (selectedStudents) => {
    setNewEvent({ ...newEvent, students: selectedStudents });
  };

  const handleAvailabilityChange = (e) => {
    const { name, value } = e.target;
    setNewAvailability({ ...newAvailability, [name]: value });
  };

  // Form submission handlers
  const handleSubmit = async (e) => {
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
      if (modals.isEditing) {
        const eventDoc = doc(db, 'events', modals.eventToEdit.id);
        await updateDoc(eventDoc, eventData);
        eventsData.setAllEvents(eventsData.allEvents.map(event =>
          event.id === modals.eventToEdit.id ? { ...eventData, id: modals.eventToEdit.id } : event
        ));
        await addOrUpdateEventInQueue({ ...eventData, id: modals.eventToEdit.id }, 'update');
      } else {
        const docRef = await addDoc(collection(db, 'events'), eventData);
        eventData.id = docRef.id;
        eventsData.setAllEvents([...eventsData.allEvents, { ...eventData, id: docRef.id }]);
        await addOrUpdateEventInQueue(eventData, 'store');
      }
      modals.setShowTeacherModal(false);
    } catch (error) {
      console.error('Failed to submit event:', error);
    }
  };

  const handleStudentSubmit = async (e) => {
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
      if (modals.isEditing) {
        const eventDoc = doc(db, 'events', modals.eventToEdit.id);
        await updateDoc(eventDoc, eventData);
        eventsData.setAllEvents(eventsData.allEvents.map(event =>
          event.id === modals.eventToEdit.id ? { ...eventData, id: modals.eventToEdit.id } : event
        ));
        await addOrUpdateEventInQueue({ ...eventData, id: modals.eventToEdit.id }, 'update');
      } else {
        const docRef = await addDoc(collection(db, 'events'), eventData);
        eventData.id = docRef.id;
        eventsData.setAllEvents([...eventsData.allEvents, { ...eventData, id: docRef.id }]);
        await addOrUpdateEventInQueue(eventData, 'store');
      }
      modals.setShowStudentModal(false);
    } catch (error) {
      console.error('Failed to submit event:', error);
    }
  };

  const handleAvailabilitySubmit = async (e) => {
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
      if (modals.isEditing) {
        const availabilityDoc = doc(db, 'availabilities', modals.eventToEdit.id);
        await updateDoc(availabilityDoc, availabilityData);
        eventsData.setAvailabilities(eventsData.availabilities.map(availability =>
          availability.id === modals.eventToEdit.id ? { ...availabilityData, id: modals.eventToEdit.id } : availability
        ));
      } else {
        const docRef = await addDoc(collection(db, 'availabilities'), availabilityData);
        eventsData.setAvailabilities([...eventsData.availabilities, { ...availabilityData, id: docRef.id }]);
      }
      modals.setShowAvailabilityModal(false);
    } catch (error) {
      console.error('Failed to submit availability:', error);
    }
  };

  const handleDelete = async () => {
    if (modals.eventToEdit && modals.eventToEdit.id) {
      const collectionName = modals.eventToEdit.tutor ? 'availabilities' : 'events';
      try {
        await deleteDoc(doc(db, collectionName, modals.eventToEdit.id));
        if (collectionName === 'availabilities') {
          eventsData.setAvailabilities(eventsData.availabilities.filter(availability =>
            availability.id !== modals.eventToEdit.id
          ));
        } else {
          eventsData.setAllEvents(eventsData.allEvents.filter(event =>
            event.id !== modals.eventToEdit.id
          ));
        }
        await removeEventFromQueue(modals.eventToEdit.id);
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
      const eventDoc = doc(db, 'events', event.id);

      try {
        await updateDoc(eventDoc, {
          studentResponses: updatedStudentResponses,
        });
        eventsData.setAllEvents(eventsData.allEvents.map(evt => (evt.id === event.id ? updatedEvent : evt)));
      } catch (error) {
        console.error('Failed to update student response:', error);
      }
    }
  };

  return {
    newEvent,
    setNewEvent,
    newAvailability,
    setNewAvailability,
    handleSelectSlot,
    handleSelectEvent,
    handleEventDrop,
    handleEventResize,
    handleInputChange,
    handleLocationChange,
    handleSubmit,
    handleStudentSubmit,
    handleDelete,
    handleStaffChange,
    handleClassChange,
    handleStudentChange,
    handleAvailabilityChange,
    handleAvailabilitySubmit,
    handleConfirmation,
  };
};