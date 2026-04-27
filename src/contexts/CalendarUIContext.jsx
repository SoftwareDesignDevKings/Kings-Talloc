'use client';

import { createContext, useContext, useState, useMemo, useCallback } from "react";
import useCalendarStrategy from "@/hooks/useCalendarStrategy"
import useAuthSession from "@/hooks/useAuthSession"
import { useAppData } from "@/contexts/AppDataContext"
import { CalendarEntityType } from "@lib/patterns/calendarStrategy"
import { calendarAvailabilitySplit } from "@/utils/calendarAvailability"

/**
 * Returns true if an availability's workType matches the selected filter.
 * 'tutoringOrWork' availabilities are included when filtering by 'tutoring' or 'work',
 * and vice-versa.
 */
const matchesWorkTypeFilter = (availWorkType, filterWorkType) => {
    if (filterWorkType === 'tutoringOrWork') {
        return availWorkType === 'tutoring' || availWorkType === 'work' || availWorkType === 'tutoringOrWork';
    }
    if (filterWorkType === 'tutoring') {
        return availWorkType === 'tutoring' || availWorkType === 'tutoringOrWork';
    }
    if (filterWorkType === 'work') {
        return availWorkType === 'work' || availWorkType === 'tutoringOrWork';
    }
    return availWorkType === filterWorkType;
};

/**
 * Context for calendar UI state (filters, visibility toggles, etc.)
 * Manages UI state that changes frequently.
 * Separated from data context to prevent unnecessary re-fetching.
 */
export const CalendarUIContext = createContext(null);

export const useCalendarUI = () => {
    const context = useContext(CalendarUIContext);
    if (!context) {
        throw new Error('useCalendarUI must be used within CalendarUIContextProvider');
    }
    return context;
};

/**
 * UI Provider to persist on re-renders across different page.jsx
 */
export const CalendarUIContextProvider = ({ children }) => {
    const { session, userRole, userRoles } = useAuthSession();
    const userEmail = session.user.email;

    // Get calendar data
    const { calendarShifts, calendarAvailabilities, calendarStudentRequests, subjects } = useAppData();

    // cal strategy for filters and scope
    const calendarStrategy = useCalendarStrategy(userEmail, userRole);
    const { calendarFilters, calendarScope } = calendarStrategy;

    // Visibility toggles (defaults from strategy)
    const [showAllEvents, setShowAllEvents] = useState(true);
    const [showTutorInitials, setShowTutorInitials] = useState(true);
    const [hideOwnAvailabilities, setHideOwnAvailabilities] = useState(false);
    const [hideDeniedStudentRequests, setHideDeniedStudentRequests] = useState(false);
    const [showTutoringEvents, setShowTutoringEvents] = useState(true);
    const [showCoachingEvents, setShowCoachingEvents] = useState(true);
    const [showWorkEvents, setShowWorkEvents] = useState(true);

    // Hierarchical toggle handlers
    const handleShowAllEventsChange = useCallback((checked) => {
        setShowAllEvents(checked);
        if (!checked) {
            // Uncheck all sub-toggles when parent is unchecked
            setShowTutoringEvents(false);
            setShowCoachingEvents(false);
            setShowWorkEvents(false);
        } else {
            // Check all sub-toggles when parent is checked
            setShowTutoringEvents(true);
            setShowCoachingEvents(true);
            setShowWorkEvents(true);
        }
    }, []);

    const handleShowTutoringEventsChange = useCallback((checked) => {
        setShowTutoringEvents(checked);
        if (checked && !showAllEvents) {
            // If enabling this and parent is off, turn parent on
            setShowAllEvents(true);
        } else if (!checked && !showCoachingEvents && !showWorkEvents) {
            // If disabling this and all others are off, turn parent off
            setShowAllEvents(false);
        }
    }, [showAllEvents, showCoachingEvents, showWorkEvents]);

    const handleShowCoachingEventsChange = useCallback((checked) => {
        setShowCoachingEvents(checked);
        if (checked && !showAllEvents) {
            // If enabling this and parent is off, turn parent on
            setShowAllEvents(true);
        } else if (!checked && !showTutoringEvents && !showWorkEvents) {
            // If disabling this and all others are off, turn parent off
            setShowAllEvents(false);
        }
    }, [showAllEvents, showTutoringEvents, showWorkEvents]);

    const handleShowWorkEventsChange = useCallback((checked) => {
        setShowWorkEvents(checked);
        if (checked && !showAllEvents) {
            // If enabling this and parent is off, turn parent on
            setShowAllEvents(true);
        } else if (!checked && !showTutoringEvents && !showCoachingEvents) {
            // If disabling this and all others are off, turn parent off
            setShowAllEvents(false);
        }
    }, [showAllEvents, showTutoringEvents, showCoachingEvents]);

    // Filter panel state (defined by user)
    const [filterBySubject, setFilterBySubject] = useState(null);
    const [filterByTutor, setFilterByTutor] = useState(null);
    const [filterByWorkType, setFilterByWorkType] = useState(null);
    const [filterAvailabilityByWorkType, setFilterAvailabilityByWorkType] = useState(null);

    // ─────────────────────────────────────
    // Merge all calendar entities
    // ─────────────────────────────────────
    const calendarEntities = useMemo(
        () => [
            ...calendarShifts,
            ...calendarStudentRequests,
        ],
        [calendarShifts, calendarStudentRequests],
    );

    // Filter RBC events by panel controls
    const filteredEvents = useMemo(() => {
        let filtered = [...calendarEntities];

        // apply "Show All Events" toggle
        if (!showAllEvents) {
            return [];
        }

        // filter by tutoring/coaching/work type
        if (!showTutoringEvents) {
            filtered = filtered.filter(e => !(e.entityType === CalendarEntityType.SHIFT && e.workType === 'tutoring'));
        }
        if (!showCoachingEvents) {
            filtered = filtered.filter(e => !(e.entityType === CalendarEntityType.SHIFT && e.workType === 'coaching'));
        }
        if (!showWorkEvents) {
            filtered = filtered.filter(e => !(e.entityType === CalendarEntityType.SHIFT && e.workType === 'work'));
        }

        // filter by tutor selection
        if (filterByTutor && filterByTutor.length > 0) {
            const selectedTutorEmails = filterByTutor.map(t => t.value);
            filtered = filtered.filter(calEvent => {
                // for shifts, check if any staff member matches
                if (calEvent.entityType === CalendarEntityType.SHIFT) {
                    return calEvent.staff?.some(s => selectedTutorEmails.includes(s.value || s));
                }
                // for availabilities, check tutor field
                if (calEvent.entityType === CalendarEntityType.AVAILABILITY) {
                    return selectedTutorEmails.includes(calEvent.tutor);
                }
                return true;
            });
        }

        // hide denied student requests from CalendarUIContextProvider
        if (hideDeniedStudentRequests) {
            filtered = filtered.filter(calEvent =>
                !(calEvent.entityType === CalendarEntityType.STUDENT_REQUEST && calEvent.approvalStatus === 'denied')
            );
        }

        // for tutors: split own availabilities around shifts as RBC events (never other tutors')
        if (userRole === 'tutor' && showTutorInitials && !hideOwnAvailabilities) {
            let availabilities = calendarAvailabilities.filter(a => a.tutor === userEmail);
            if (filterAvailabilityByWorkType && filterAvailabilityByWorkType.length > 0) {
                availabilities = availabilities.filter(a =>
                    filterAvailabilityByWorkType.some(f => matchesWorkTypeFilter(a.workType, f.value))
                );
            }
            const splitAvailabilities = calendarAvailabilitySplit(availabilities, filtered);
            filtered = [...filtered, ...splitAvailabilities];
        }

        return filtered;
    }, [calendarEntities, showAllEvents, showTutoringEvents, showCoachingEvents, showWorkEvents, filterByTutor, hideDeniedStudentRequests, userRole, showTutorInitials, hideOwnAvailabilities, calendarAvailabilities, filterAvailabilityByWorkType, userEmail]);

    // ─────────────────────────────────────
    // Filter availabilities by panel controls
    // ─────────────────────────────────────
    const filteredAvailabilities = useMemo(() => {

        // check strategy-level and CalendarUIContextProvider visibility settings
        if (!showTutorInitials) {
            return [];
        }

        let filtered = calendarAvailabilities;

        // tutors: hide own availabilities if CalendarUIContextProvider setting is enabled
        if (userRole === 'tutor') {
            if (hideOwnAvailabilities) {
                filtered = filtered.filter((a) => a.tutor !== userEmail);
            } else {
                // Show all availabilities including own
                filtered = calendarAvailabilities;
            }
        }

        // students: filter by selected subject's tutors from CalendarUIContextProvider
        if (userRole === 'student' && filterBySubject) {
            const selectedSubject = subjects?.find(s => s.id === filterBySubject.value);
            if (selectedSubject?.tutors) {
                const subjectTutorEmails = selectedSubject.tutors.map(t => t.email);
                filtered = filtered.filter(a => subjectTutorEmails.includes(a.tutor));
            }
        }

        // students: only show tutoring availabilities (exclude coaching and work)
        if (userRole === 'student') {
            filtered = filtered.filter(a =>
                a.workType === 'tutoring' ||
                a.workType === 'tutoringOrWork' ||
                a.workType === undefined
            );
        }

        // filter by selected tutors from CalendarUIContextProvider
        if (filterByTutor && filterByTutor.length > 0) {
            const selectedTutorEmails = filterByTutor.map(t => t.value);
            filtered = filtered.filter(a => selectedTutorEmails.includes(a.tutor));
        }

        // filter by availability work type from CalendarUIContextProvider
        if (filterAvailabilityByWorkType && filterAvailabilityByWorkType.length > 0) {
            filtered = filtered.filter(a =>
                filterAvailabilityByWorkType.some(f => matchesWorkTypeFilter(a.workType, f.value))
            );
        }

        // Split availabilities around clashing shifts (always use actual shifts, not filtered)
        const splitAvailabilities = calendarAvailabilitySplit(filtered, calendarShifts);

        return splitAvailabilities;
    }, [showTutorInitials, calendarAvailabilities, userRole, hideOwnAvailabilities, userEmail, filterBySubject, subjects, filterByTutor, filterAvailabilityByWorkType, calendarShifts]);

    // ─────────────────────────────────────
    // context values
    // ─────────────────────────────────────
    const value = useMemo(() => (
        {
            filters: {
                filterBySubject,
                filterByTutor,
                filterByWorkType,
                filterAvailabilityByWorkType,
            },

            visibility: {
                showAllEvents,
                showTutorInitials,
                hideOwnAvailabilities,
                hideDeniedStudentRequests,
                showTutoringEvents,
                showCoachingEvents,
                showWorkEvents,
            },

            // Filtered data (ready to use)
            filteredEvents,
            filteredAvailabilities,

            // strategy-defined capabilities (read-only)
            calendarFilters,
            calendarScope,

            actions: {
                setFilterBySubject,
                setFilterByTutor,
                setFilterByWorkType,
                setFilterAvailabilityByWorkType,
                setShowAllEvents: handleShowAllEventsChange,
                setShowTutorInitials,
                setHideOwnAvailabilities,
                setHideDeniedStudentRequests,
                setShowTutoringEvents: handleShowTutoringEventsChange,
                setShowCoachingEvents: handleShowCoachingEventsChange,
                setShowWorkEvents: handleShowWorkEventsChange,
            },
        }),
        [
            filterBySubject,
            filterByTutor,
            filterByWorkType,
            filterAvailabilityByWorkType,
            showAllEvents,
            showTutorInitials,
            hideOwnAvailabilities,
            hideDeniedStudentRequests,
            showTutoringEvents,
            showCoachingEvents,
            showWorkEvents,
            filteredEvents,
            filteredAvailabilities,
            calendarFilters,
            calendarScope,
            handleShowAllEventsChange,
            handleShowTutoringEventsChange,
            handleShowCoachingEventsChange,
            handleShowWorkEventsChange,
        ],
    );

    return (
        <CalendarUIContext.Provider value={value}>
            {children}
        </CalendarUIContext.Provider>
    );
};
