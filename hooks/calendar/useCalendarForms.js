"use client";

import { useState } from 'react';

/**
 * Custom hook for managing calendar form states and transitions
 */
export const useCalendarForms = () => {
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showAvailabilityForm, setShowAvailabilityForm] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [eventToEdit, setEventToEdit] = useState(null);

  const closeAllForms = () => {
    setShowTeacherForm(false);
    setShowStudentForm(false);
    setShowAvailabilityForm(false);
    setShowDetailsModal(false);
    setIsEditing(false);
    setEventToEdit(null);
  };

  const openTeacherForm = (event = null, editing = false) => {
    closeAllForms();
    setShowTeacherForm(true);
    setIsEditing(editing);
    setEventToEdit(event);
  };

  const openStudentForm = (event = null, editing = false) => {
    closeAllForms();
    setShowStudentForm(true);
    setIsEditing(editing);
    setEventToEdit(event);
  };

  const openAvailabilityForm = (availability = null, editing = false) => {
    closeAllForms();
    setShowAvailabilityForm(true);
    setIsEditing(editing);
    setEventToEdit(availability);
  };

  const openDetailsModal = (event) => {
    closeAllForms();
    setShowDetailsModal(true);
    setEventToEdit(event);
  };

  return {
    showTeacherForm,
    setShowTeacherForm,
    showStudentForm,
    setShowStudentForm,
    showAvailabilityForm,
    setShowAvailabilityForm,
    showDetailsModal,
    setShowDetailsModal,
    isEditing,
    setIsEditing,
    eventToEdit,
    setEventToEdit,
    closeAllForms,
    openTeacherForm,
    openStudentForm,
    openAvailabilityForm,
    openDetailsModal
  };
};