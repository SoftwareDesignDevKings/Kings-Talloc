"use client";

import React from 'react';
import CalendarContext from '@contexts/CalendarContext';
import { useCalendarEvents } from '@hooks/calendar/useCalendarEvents';
import { useCalendarUI, useCalendarFilterState } from '@hooks/calendar/useCalendarState';
import { useCalendarModals } from '@hooks/calendar/useCalendarModals';
import { useCalendarInteractions } from '@hooks/calendar/useCalendarInteractions';

export const CalendarProvider = ({ children, userRole, userEmail }) => {
  // Compose all calendar-related state and logic
  const eventsData = useCalendarEvents(userRole, userEmail);
  const uiState = useCalendarUI();
  const filterState = useCalendarFilterState();
  const modals = useCalendarModals();
  const handlers = useCalendarInteractions(userRole, userEmail, modals, eventsData);

  // Create filtering functions
  const getFilteredEvents = (allEvents, userEmail) => {
    let filtered = [...allEvents];
    const { visibility, tutors } = filterState.filters;

    // Apply role-based filters
    if (userRole === 'tutor') {
      filtered = filtered.filter(event =>
        event.staff.some(staff => staff.value === userEmail)
      );

      if (visibility.hideOwnAvailabilities) {
        filtered = filtered.filter(event => event.tutor !== userEmail);
      }
    }

    if ((userRole === 'tutor' || userRole === 'teacher') && visibility.hideDeniedStudentEvents) {
      filtered = filtered.filter(event =>
        !(event.createdByStudent && event.approvalStatus === 'denied')
      );
    }

    // Apply tutor filter
    if (tutors.length > 0) {
      const selectedTutorValues = tutors.map(tutor => tutor.value);
      filtered = filtered.filter(event =>
        event.staff.some(staff => selectedTutorValues.includes(staff.value))
      );
    }

    return filtered;
  };

  const getFilteredAvailabilities = (splitAvailabilitiesData) => {
    let filtered = splitAvailabilitiesData;
    const { subject, tutors, visibility } = filterState.filters;

    if (userRole === "student") {
      filtered = filtered.filter(availability =>
        (availability.workType === 'tutoring' || availability.workType === 'tutoringOrWork' || availability.workType === undefined)
      );
    }

    if ((userRole === 'tutor' || userRole === 'teacher') && visibility.hideTutoringAvailabilites) {
      filtered = filtered.filter(availability =>
        !(availability.workType === 'tutoring')
      );
    }

    if ((userRole === 'tutor' || userRole === 'teacher') && visibility.hideWorkAvailabilities) {
      filtered = filtered.filter(availability =>
        !(availability.workType === 'work')
      );
    }

    if ((userRole === 'tutor' || userRole === 'teacher') && visibility.hideTutoringAvailabilites && visibility.hideWorkAvailabilities) {
      filtered = filtered.filter(availability =>
        !(availability.workType === 'tutoringOrWork')
      );
    }

    if (subject) {
      if (tutors.length > 0) {
        return filtered.filter(avail =>
          tutors.some(tutor => tutor.value === avail.tutor)
        );
      } else {
        return filtered.filter(avail =>
          subject.tutors.some(tutor => tutor.email === avail.tutor)
        );
      }
    }

    if (tutors.length > 0) {
      return filtered.filter(avail =>
        tutors.some(tutor => tutor.value === avail.tutor)
      );
    }

    return filtered;
  };

  const value = {
    // Data
    eventsData,

    // UI State (no more confusing ui.ui!)
    uiState,

    // Filter State
    filterState,

    // Modal State
    modals,

    // Handlers
    handlers,

    // Computed Functions
    getFilteredEvents,
    getFilteredAvailabilities,

    // User Info
    userRole,
    userEmail
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
};