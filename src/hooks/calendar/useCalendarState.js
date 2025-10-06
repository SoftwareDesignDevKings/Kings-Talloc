"use client";

import { useState } from 'react';

/**
 * Hook for managing visibility and UI state
 */
export const useCalendarUI = () => {
  const [showEvents, setShowEvents] = useState(true);
  const [showInitials, setShowInitials] = useState(true);
  // Collapse filter panel by default on mobile
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  return {
    showEvents,
    showInitials,
    isFilterPanelOpen,
    setShowEvents,
    setShowInitials,
    setIsFilterPanelOpen
  };
};

/**
 * Hook for managing filter state
 */
export const useCalendarFilterState = () => {
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedTutors, setSelectedTutors] = useState([]);
  const [hideOwnAvailabilities, setHideOwnAvailabilities] = useState(false);
  const [hideDeniedStudentEvents, setHideDeniedStudentEvents] = useState(false);
  const [hideTutoringAvailabilites, setHideTutoringAvailabilites] = useState(false);
  const [hideWorkAvailabilities, setHideWorkAvailabilities] = useState(false);

  const handleTutorFilterChange = (selectedOptions) => {
    setSelectedTutors(selectedOptions);
  };

  // Group filters by type for easier management
  const filters = {
    subject: selectedSubject,
    tutors: selectedTutors,
    visibility: {
      hideOwnAvailabilities,
      hideDeniedStudentEvents,
      hideTutoringAvailabilites,
      hideWorkAvailabilities
    }
  };

  const filterActions = {
    setSelectedSubject,
    setSelectedTutors,
    handleTutorFilterChange,
    setHideOwnAvailabilities,
    setHideDeniedStudentEvents,
    setHideTutoringAvailabilites,
    setHideWorkAvailabilities
  };

  return {
    filters,
    filterActions
  };
};