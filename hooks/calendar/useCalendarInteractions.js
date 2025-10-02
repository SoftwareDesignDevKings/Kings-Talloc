import { useState } from 'react';

/**
 * Hook for handling calendar interactions (slot selection, event selection)
 * Used by: CalendarWrapper
 */
export const useCalendarInteractions = (userRole, userEmail, forms) => {
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
    if (event.tutor) {
      if (userRole === 'tutor' && event.tutor === userEmail) {
        setNewAvailability(event);
        forms.setIsEditing(true);
        forms.setEventToEdit(event);
        forms.setShowAvailabilityForm(true);
      } else {
        forms.setEventToEdit(event);
        forms.setShowDetailsModal(true);
      }
    } else {
      if (userRole === 'teacher') {
        setNewEvent(event);
        forms.setIsEditing(true);
        forms.setEventToEdit(event);
        forms.setShowTeacherForm(true);
      } else if (userRole === 'student' && event.createdByStudent) {
        if (event.approvalStatus === 'pending') {
          setNewEvent(event);
          forms.setIsEditing(true);
          forms.setEventToEdit(event);
          forms.setShowStudentForm(true);
        } else {
          forms.setEventToEdit(event);
          forms.setShowDetailsModal(true);
        }
      } else {
        forms.setEventToEdit(event);
        forms.setShowDetailsModal(true);
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