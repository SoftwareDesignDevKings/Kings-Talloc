import { useState } from 'react';
import { updateEventInFirestore, createEventInFirestore, addOrUpdateEventInQueue } from '@/utils/firebaseOperations';
import { createTeamsMeeting } from '../../meetings/msTeams';

/**
 * Hook for handling EventForm (teacher) operations
 * Used by: EventForm
 */
export const useEventForm = (eventsData) => {

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

        // Check if event was just approved and create Teams meeting
        if (eventData.approvalStatus === "approved" && eventToEdit.approvalStatus !== "approved") {
          const subject = eventData.title;
          const description = eventData.description || "";
          const startTime = new Date(eventData.start).toISOString();
          const endTime = new Date(eventData.end).toISOString();
          const attendeesEmailArr = [...eventData.students, ...eventData.staff].map(p => p.value);

          await createTeamsMeeting({ ...eventData, id: eventToEdit.id }, subject, description, startTime, endTime, attendeesEmailArr);
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