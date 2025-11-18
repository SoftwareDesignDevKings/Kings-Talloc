"use client";

import { useState } from 'react';

/**
 * Hook for managing visibility and UI state
 */
export const useCalendarUI = (filterState) => {
	const [showEvents, setShowEvents] = useState(true);
	const [showInitials, setShowInitials] = useState(true);
	
	// Collapse filter panel by default on mobile
	const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(() => {
		if (typeof window !== 'undefined') {
			return window.innerWidth >= 768;
		}
		return true;
	});

	const handleShowEventsChange = (checked) => {
		setShowEvents(checked);
	};

	return {
		showEvents,
		showInitials,
		isFilterPanelOpen,
		setShowEvents: handleShowEventsChange,
		rawSetShowEvents: setShowEvents,
		setShowInitials,
		setIsFilterPanelOpen
	};
};

/**
 * Hook for managing filter state
 */
export const useCalendarFilterState = (uiState) => {
	const [selectedSubject, setSelectedSubject] = useState(null);
	const [selectedTutors, setSelectedTutors] = useState([]);
	const [selectedWorkType, setSelectedWorkType] = useState(null); 
	// 'tutoring', 'coaching', or null for all

	const [selectedAvailabilityWorkType, setSelectedAvailabilityWorkType] = useState(null); 
	// 'tutoring', 'work', 'tutoringOrWork', or null for all
	
	const [hideOwnAvailabilities, setHideOwnAvailabilities] = useState(false);
	const [hideDeniedStudentEvents, setHideDeniedStudentEvents] = useState(false);
	const [hideTutoringAvailabilites, setHideTutoringAvailabilites] = useState(false);
	const [hideWorkAvailabilities, setHideWorkAvailabilities] = useState(false);
	const [showTutoringEvents, setShowTutoringEvents] = useState(true);
	const [showCoachingEvents, setShowCoachingEvents] = useState(true);

	const handleTutorFilterChange = (selectedOptions) => {
		setSelectedTutors(selectedOptions);
	};

	const handleShowTutoringEventsChange = (checked) => {
		setShowTutoringEvents(checked);
		if (uiState) {
			// If checking this, check Show Events
			if (checked) {
				uiState.rawSetShowEvents(true);
			}
			// If both are unchecked, uncheck Show Events
			else if (!checked && !showCoachingEvents) {
				uiState.rawSetShowEvents(false);
			}
		}
	};

	const handleShowCoachingEventsChange = (checked) => {
		setShowCoachingEvents(checked);
		if (uiState) {
			// If checking this, check Show Events
			if (checked) {
				uiState.rawSetShowEvents(true);
			}
			// If both are unchecked, uncheck Show Events
			else if (!checked && !showTutoringEvents) {
				uiState.rawSetShowEvents(false);
			}
		}
	};

	// Group filters by type for easier management
	const filters = {
		subject: selectedSubject,
		tutors: selectedTutors,
		workType: selectedWorkType,
		availabilityWorkType: selectedAvailabilityWorkType,
		visibility: {
		hideOwnAvailabilities,
		hideDeniedStudentEvents,
		hideTutoringAvailabilites,
		hideWorkAvailabilities,
		showTutoringEvents,
		showCoachingEvents
		}
	};

	const filterActions = {
		setSelectedSubject,
		setSelectedTutors,
		setSelectedWorkType,
		setSelectedAvailabilityWorkType,
		handleTutorFilterChange,
		setHideOwnAvailabilities,
		setHideDeniedStudentEvents,
		setHideTutoringAvailabilites,
		setHideWorkAvailabilities,
		setShowTutoringEvents: handleShowTutoringEventsChange,
		setShowCoachingEvents: handleShowCoachingEventsChange
	};

	return {
		filters,
		filterActions
	};
};
