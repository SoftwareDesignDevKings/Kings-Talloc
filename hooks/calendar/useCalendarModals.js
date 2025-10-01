"use client";

import { useState } from 'react';

/**
 * Custom hook for managing calendar modal states and transitions
 */
export const useCalendarModals = () => {
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [eventToEdit, setEventToEdit] = useState(null);

  const closeAllModals = () => {
    setShowTeacherModal(false);
    setShowStudentModal(false);
    setShowAvailabilityModal(false);
    setShowDetailsModal(false);
    setIsEditing(false);
    setEventToEdit(null);
  };

  const openTeacherModal = (event = null, editing = false) => {
    closeAllModals();
    setShowTeacherModal(true);
    setIsEditing(editing);
    setEventToEdit(event);
  };

  const openStudentModal = (event = null, editing = false) => {
    closeAllModals();
    setShowStudentModal(true);
    setIsEditing(editing);
    setEventToEdit(event);
  };

  const openAvailabilityModal = (availability = null, editing = false) => {
    closeAllModals();
    setShowAvailabilityModal(true);
    setIsEditing(editing);
    setEventToEdit(availability);
  };

  const openDetailsModal = (event) => {
    closeAllModals();
    setShowDetailsModal(true);
    setEventToEdit(event);
  };

  return {
    showTeacherModal,
    setShowTeacherModal,
    showStudentModal,
    setShowStudentModal,
    showAvailabilityModal,
    setShowAvailabilityModal,
    showDetailsModal,
    setShowDetailsModal,
    isEditing,
    setIsEditing,
    eventToEdit,
    setEventToEdit,
    closeAllModals,
    openTeacherModal,
    openStudentModal,
    openAvailabilityModal,
    openDetailsModal
  };
};