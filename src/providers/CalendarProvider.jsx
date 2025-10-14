"use client";

import React from 'react';
import CalendarContext from '@contexts/CalendarContext.jsx';
import { useCalendarEvents } from '@hooks/calendar/useCalendarEvents';
import { useCalendarUI, useCalendarFilterState } from '@hooks/calendar/useCalendarState';
import { useCalendarForms } from '@hooks/calendar/useCalendarForms';
import { useCalendarInteractions } from '@hooks/calendar/useCalendarInteractions';

export const CalendarProvider = ({ children, userRole, userEmail }) => {
  // Compose all calendar-related state and logic
  const eventsData = useCalendarEvents(userRole, userEmail);
  const uiState = useCalendarUI();
  const filterState = useCalendarFilterState(uiState);

  // Override setShowEvents to also update the event type filters
  const originalSetShowEvents = uiState.setShowEvents;
  uiState.setShowEvents = (checked) => {
    originalSetShowEvents(checked);
    if (checked) {
      filterState.filterActions.setShowTutoringEvents(true);
      filterState.filterActions.setShowCoachingEvents(true);
    }
  };

  const forms = useCalendarForms();
  const handlers = useCalendarInteractions(userRole, userEmail, forms, eventsData);

  // Create filtering functions
  const getFilteredEvents = (allEvents, userEmail) => {
    let filtered = [...allEvents];
    const { visibility, tutors, workType } = filterState.filters;

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

    // Apply work type filter for teachers based on checkboxes
    if (userRole === 'teacher') {
      if (!visibility.showTutoringEvents && !visibility.showCoachingEvents) {
        // If both unchecked, show nothing
        filtered = [];
      } else if (!visibility.showTutoringEvents) {
        // Only show coaching
        filtered = filtered.filter(event => event.workType === 'coaching');
      } else if (!visibility.showCoachingEvents) {
        // Only show tutoring
        filtered = filtered.filter(event => event.workType === 'tutoring');
      }
      // If both checked, show all (no filter)
    }

    return filtered;
  };

  const getFilteredAvailabilities = (splitAvailabilitiesData) => {
    let filtered = splitAvailabilitiesData;
    const { subject, tutors, visibility, availabilityWorkType } = filterState.filters;

    if (userRole === "student") {
      filtered = filtered.filter(availability =>
        (availability.workType === 'tutoring' || availability.workType === 'tutoringOrWork' || availability.workType === undefined)
      );
    }

    // Apply availability work type filter for teachers
    if (userRole === 'teacher' && availabilityWorkType) {
      filtered = filtered.filter(availability => availability.workType === availabilityWorkType);
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

    // Form State
    forms,

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