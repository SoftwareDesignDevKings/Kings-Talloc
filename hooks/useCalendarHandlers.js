"use client";

import { useState } from 'react';
import {
  handleSelectSlot as originalHandleSelectSlot,
  handleSelectEvent as originalHandleSelectEvent,
  handleEventDrop as originalHandleEventDrop,
  handleEventResize as originalHandleEventResize,
  handleInputChange as originalHandleInputChange,
  handleSubmit as originalHandleSubmit,
  handleDelete as originalHandleDelete,
  handleStaffChange as originalHandleStaffChange,
  handleClassChange as originalHandleClassChange,
  handleStudentChange as originalHandleStudentChange,
  handleAvailabilityChange as originalHandleAvailabilityChange,
  handleAvailabilitySubmit as originalHandleAvailabilitySubmit,
  handleConfirmation as originalHandleConfirmation,
} from '@components/calendar/handlers';

/**
 * Custom hook for calendar event and form handlers
 */
export const useCalendarHandlers = (userRole, userEmail, modals, eventsData) => {
  const [newEvent, setNewEvent] = useState({});
  const [newAvailability, setNewAvailability] = useState({});

  const {
    openTeacherModal,
    openStudentModal,
    openAvailabilityModal,
    openDetailsModal,
    setShowTeacherModal,
    setShowStudentModal,
    setShowAvailabilityModal,
    setIsEditing,
    eventToEdit
  } = modals;

  const {
    allEvents,
    setAllEvents,
    availabilities,
    setAvailabilities
  } = eventsData;

  // Slot selection handler
  const handleSelectSlot = (slotInfo) => {
    originalHandleSelectSlot(
      slotInfo,
      userRole,
      setNewEvent,
      setNewAvailability,
      setIsEditing,
      setShowTeacherModal,
      setShowStudentModal,
      setShowAvailabilityModal,
      userEmail
    );
  };

  // Event selection handler
  const handleSelectEvent = (event) => {
    originalHandleSelectEvent(
      event,
      userRole,
      userEmail,
      setNewEvent,
      setNewAvailability,
      setIsEditing,
      modals.setEventToEdit,
      setShowTeacherModal,
      setShowStudentModal,
      setShowAvailabilityModal,
      modals.setShowDetailsModal
    );
  };

  // Event drag and drop handler
  const handleEventDrop = (dropInfo) => {
    originalHandleEventDrop(
      dropInfo,
      allEvents,
      availabilities,
      setAllEvents,
      setAvailabilities,
      userRole
    );
  };

  // Event resize handler
  const handleEventResize = (resizeInfo) => {
    originalHandleEventResize(
      resizeInfo,
      allEvents,
      availabilities,
      setAllEvents,
      setAvailabilities,
      userRole
    );
  };

  // Form input change handler
  const handleInputChange = (e) => {
    originalHandleInputChange(e, setNewEvent, newEvent);
  };

  // Form submission handler
  const handleSubmit = (e) => {
    originalHandleSubmit(
      e,
      modals.isEditing,
      newEvent,
      eventToEdit,
      setAllEvents,
      allEvents,
      setShowTeacherModal
    );
  };

  // Student form submission handler
  const handleStudentSubmit = (e) => {
    originalHandleSubmit(
      e,
      modals.isEditing,
      newEvent,
      eventToEdit,
      setAllEvents,
      allEvents,
      setShowStudentModal
    );
  };

  // Delete handler
  const handleDelete = () => {
    originalHandleDelete(
      eventToEdit,
      allEvents,
      setAllEvents,
      availabilities,
      setAvailabilities,
      setShowTeacherModal
    );
  };

  // Staff change handler
  const handleStaffChange = (selectedStaff) => {
    originalHandleStaffChange(selectedStaff, setNewEvent, newEvent);
  };

  // Class change handler
  const handleClassChange = (selectedClasses) => {
    originalHandleClassChange(selectedClasses, setNewEvent, newEvent);
  };

  // Student change handler
  const handleStudentChange = (selectedStudents) => {
    originalHandleStudentChange(selectedStudents, setNewEvent, newEvent);
  };

  // Availability change handler
  const handleAvailabilityChange = (e) => {
    originalHandleAvailabilityChange(e, setNewAvailability, newAvailability);
  };

  // Availability submission handler
  const handleAvailabilitySubmit = (e) => {
    originalHandleAvailabilitySubmit(
      e,
      modals.isEditing,
      newAvailability,
      eventToEdit,
      setAvailabilities,
      availabilities,
      setShowAvailabilityModal
    );
  };

  // Confirmation handler
  const handleConfirmation = (confirmed) => {
    originalHandleConfirmation(
      eventToEdit,
      confirmed,
      userRole,
      userEmail,
      allEvents,
      setAllEvents
    );
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
    handleSubmit,
    handleStudentSubmit,
    handleDelete,
    handleStaffChange,
    handleClassChange,
    handleStudentChange,
    handleAvailabilityChange,
    handleAvailabilitySubmit,
    handleConfirmation
  };
};