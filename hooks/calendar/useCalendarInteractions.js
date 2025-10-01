import { useState } from 'react';

/**
 * Hook for handling calendar interactions (slot selection, event selection)
 * Used by: CalendarWrapper
 */
export const useCalendarInteractions = (userRole, userEmail, modals) => {
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

  return {
    newEvent,
    setNewEvent,
    newAvailability,
    setNewAvailability,
    handleSelectSlot,
    handleSelectEvent,
  };
};