import { useState } from 'react';
import { createEventInFirestore, addOrUpdateEventInQueue } from '@/firestore/firebaseOperations';
import { createTeamsMeeting } from '@/utils/msTeams';

/**
 * Hook for handling calendar interactions (slot selection, event selection)
 * Used by: CalendarWrapper
 */
export const useCalendarInteractions = (userRole, userEmail, forms, eventsData) => {
  const [newEvent, setNewEvent] = useState({});
  const [newAvailability, setNewAvailability] = useState({});

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
      forms.setIsEditing(false);
      forms.setShowStudentForm(true);
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
      forms.setIsEditing(false);
      forms.setShowAvailabilityForm(true);
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
      forms.setIsEditing(false);
      forms.setShowTeacherForm(true);
    }
  };

  const handleSelectEvent = (event) => {
    console.log('handleSelectEvent called', { userRole, event, eventTutor: event.tutor });

    // Tutor clicked on an availability
    if (event.tutor) {
      // Only tutors can edit their own availabilities
      if (userRole === 'tutor' && event.tutor === userEmail) {
        console.log('Tutor editing own availability');
        setNewAvailability(event);
        forms.setIsEditing(true);
        forms.setEventToEdit(event);
        forms.setShowAvailabilityForm(true);
      } else {
        // Everyone else just views details
        console.log('Showing details modal for availability');
        forms.setEventToEdit(event);
        forms.setShowDetailsModal(true);
      }
      return;
    }

    // Teachers can edit all events (approved events)
    if (userRole === 'teacher') {
      console.log('Teacher editing event');
      setNewEvent(event);
      forms.setIsEditing(true);
      forms.setEventToEdit(event);
      forms.setShowTeacherForm(true);
      return;
    }

    // Students can only edit their own pending student requests
    if (userRole === 'student' && event.isStudentRequest) {
      // Check if student owns this request
      const isOwnRequest = event.students?.some(s => s.value === userEmail || s === userEmail);
      if (isOwnRequest) {
        console.log('Student editing own request');
        setNewEvent(event);
        forms.setIsEditing(true);
        forms.setEventToEdit(event);
        forms.setShowStudentForm(true);
        return;
      }
    }

    // Default: just show details modal
    console.log('Showing details modal (default)');
    forms.setEventToEdit(event);
    forms.setShowDetailsModal(true);
  };

  const handleDuplicateEvent = async (event) => {
    // Calculate next day's date
    const nextDayStart = new Date(event.start);
    nextDayStart.setDate(nextDayStart.getDate() + 1);

    const nextDayEnd = new Date(event.end);
    nextDayEnd.setDate(nextDayEnd.getDate() + 1);

    // Handle tutor availability duplication
    if (event.tutor && userRole === 'tutor' && event.tutor === userEmail) {
      const availabilityData = {
        title: event.title || 'Availability',
        start: nextDayStart,
        end: nextDayEnd,
        tutor: event.tutor,
        workType: event.workType || 'tutoringOrWork',
        locationType: event.locationType || '',
      };

      try {
        const docId = await createEventInFirestore(availabilityData, 'tutorAvailabilities');
        availabilityData.id = docId;
        eventsData.setAvailabilities([...eventsData.availabilities, { ...availabilityData, id: docId }]);
      } catch (error) {
        console.error('Failed to duplicate availability:', error);
      }
      return;
    }

    // Handle regular event duplication (teachers only)
    if (!event.tutor && userRole === 'teacher') {
      const eventData = {
        title: event.title || '',
        start: nextDayStart,
        end: nextDayEnd,
        description: event.description || '',
        confirmationRequired: event.confirmationRequired || false,
        staff: event.staff || [],
        classes: event.classes || [],
        students: event.students || [],
        tutorResponses: [],
        studentResponses: [],
        minStudents: event.minStudents || 0,
        createdByStudent: event.createdByStudent || false,
        approvalStatus: event.approvalStatus || 'pending',
        workStatus: 'notCompleted',
        locationType: event.locationType || '',
        subject: event.subject || null,
        preference: event.preference || null,
      };

      try {
        const docId = await createEventInFirestore(eventData);
        eventData.id = docId;
        eventsData.setAllEvents([...eventsData.allEvents, { ...eventData, id: docId }]);
        await addOrUpdateEventInQueue(eventData, 'store');

        // Create Teams meeting if event is approved
        if (eventData.approvalStatus === "approved") {
          const subject = eventData.title;
          const description = eventData.description || "";
          const startTime = new Date(eventData.start).toISOString();
          const endTime = new Date(eventData.end).toISOString();
          const attendeesEmailArr = [...eventData.students, ...eventData.staff].map(p => p.value);

          await createTeamsMeeting({ ...eventData, id: docId }, subject, description, startTime, endTime, attendeesEmailArr);
        }
      } catch (error) {
        console.error('Failed to duplicate event:', error);
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
    handleDuplicateEvent,
  };
};