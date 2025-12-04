'use client';

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { useCalendarData } from './CalendarDataProvider';
import { calendarEventFilter } from '@/utils/calendarEvent';
import { calendarAvailabilityFilter } from '@/utils/calendarAvailability';

const CalendarUIContext = createContext(null);

export const useCalendarUI = () => {
    const context = useContext(CalendarUIContext);
    if (!context) {
        throw new Error('useCalendarUI must be used within CalendarUIProvider');
    }
    return context;
};

/**
 * CalendarUIProvider
 *
 * Manages UI state (filters, visibility toggles).
 * This context changes frequently but re-renders are cheap (no heavy computations).
 * Separated from data to prevent unnecessary re-fetching.
 */
export const CalendarUIProvider = ({ children }) => {
    const { userRole, userEmail, allEvents, splitAvailabilitiesData } = useCalendarData();

    // UI State
    const [showEvents, setShowEventsRaw] = useState(true);
    const [showInitials, setShowInitials] = useState(true);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth >= 768;
        }
        return true;
    });

    // Filter State
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [selectedTutors, setSelectedTutors] = useState([]);
    const [selectedWorkType, setSelectedWorkType] = useState(null);
    const [selectedAvailabilityWorkType, setSelectedAvailabilityWorkType] = useState(null);
    const [hideOwnAvailabilities, setHideOwnAvailabilities] = useState(false);
    const [hideDeniedStudentEvents, setHideDeniedStudentEvents] = useState(false);
    const [hideTutoringAvailabilites, setHideTutoringAvailabilites] = useState(false);
    const [hideWorkAvailabilities, setHideWorkAvailabilities] = useState(false);
    const [showTutoringEvents, setShowTutoringEventsRaw] = useState(true);
    const [showCoachingEvents, setShowCoachingEventsRaw] = useState(true);

    // Computed filters object
    const filters = useMemo(
        () => ({
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
                showCoachingEvents,
            },
        }),
        [
            selectedSubject,
            selectedTutors,
            selectedWorkType,
            selectedAvailabilityWorkType,
            hideOwnAvailabilities,
            hideDeniedStudentEvents,
            hideTutoringAvailabilites,
            hideWorkAvailabilities,
            showTutoringEvents,
            showCoachingEvents,
        ],
    );

    // Filter handlers with side effects
    const setShowTutoringEvents = useCallback(
        (checked) => {
            setShowTutoringEventsRaw(checked);
            if (checked) {
                setShowEventsRaw(true);
            } else if (!checked && !showCoachingEvents) {
                setShowEventsRaw(false);
            }
        },
        [showCoachingEvents],
    );

    const setShowCoachingEvents = useCallback(
        (checked) => {
            setShowCoachingEventsRaw(checked);
            if (checked) {
                setShowEventsRaw(true);
            } else if (!checked && !showTutoringEvents) {
                setShowEventsRaw(false);
            }
        },
        [showTutoringEvents],
    );

    const setShowEvents = useCallback((checked) => {
        setShowEventsRaw(checked);
        if (checked) {
            setShowTutoringEventsRaw(true);
            setShowCoachingEventsRaw(true);
        } else {
            setShowTutoringEventsRaw(false);
            setShowCoachingEventsRaw(false);
        }
    }, []);

    // Filtered data (memoized)
    const filteredEvents = useMemo(() => {
        return calendarEventFilter(allEvents, { userRole, userEmail, filters });
    }, [allEvents, userRole, userEmail, filters]);

    const filteredAvailabilities = useMemo(() => {
        return calendarAvailabilityFilter(splitAvailabilitiesData, { userRole, filters });
    }, [splitAvailabilitiesData, userRole, filters]);

    const value = useMemo(
        () => ({
            // UI State
            showEvents,
            setShowEvents,
            showInitials,
            setShowInitials,
            isFilterPanelOpen,
            setIsFilterPanelOpen,

            // Filters
            filters,
            selectedSubject,
            setSelectedSubject,
            selectedTutors,
            setSelectedTutors,
            selectedWorkType,
            setSelectedWorkType,
            selectedAvailabilityWorkType,
            setSelectedAvailabilityWorkType,
            hideOwnAvailabilities,
            setHideOwnAvailabilities,
            hideDeniedStudentEvents,
            setHideDeniedStudentEvents,
            hideTutoringAvailabilites,
            setHideTutoringAvailabilites,
            hideWorkAvailabilities,
            setHideWorkAvailabilities,
            showTutoringEvents,
            setShowTutoringEvents,
            showCoachingEvents,
            setShowCoachingEvents,

            // Filtered data
            filteredEvents,
            filteredAvailabilities,
        }),
        [
            showEvents,
            setShowEvents,
            showInitials,
            isFilterPanelOpen,
            filters,
            selectedSubject,
            selectedTutors,
            selectedWorkType,
            selectedAvailabilityWorkType,
            hideOwnAvailabilities,
            hideDeniedStudentEvents,
            hideTutoringAvailabilites,
            hideWorkAvailabilities,
            showTutoringEvents,
            setShowTutoringEvents,
            showCoachingEvents,
            setShowCoachingEvents,
            filteredEvents,
            filteredAvailabilities,
        ],
    );

    return <CalendarUIContext.Provider value={value}>{children}</CalendarUIContext.Provider>;
};
