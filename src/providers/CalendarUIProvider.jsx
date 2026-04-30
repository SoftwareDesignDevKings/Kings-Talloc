import { useState, useMemo, useCallback } from "react";
import useCalendarStrategy from "@/hooks/useCalendarStrategy"
import useAuthSession from "@/hooks/useAuthSession"
import CalendarUIContext from "@contexts/CalendarUIContext"
import { useAppData } from "@/providers/AppDataProvider"
import { CalendarEntityType } from "@/strategy/calendarStrategy"
import { calendarAvailabilitySplit } from "@/utils/calendarAvailability"

/**
 * UI Provider to persist on re-renders across different page.jsx
 */
export const CalendarUIProvider = ({ children }) => {
    const { session, userRole } = useAuthSession();
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
            setShowTutoringEvents(false);
            setShowCoachingEvents(false);
            setShowWorkEvents(false);
            return;
        }

        setShowTutoringEvents(true);
        setShowCoachingEvents(true);
        setShowWorkEvents(true);
    }, []);

    const handleShowTutoringEventsChange = useCallback((checked) => {
        setShowTutoringEvents(checked);

        if (checked && !showAllEvents) {
            setShowAllEvents(true);
            return;
        }

        if (!checked && !showCoachingEvents && !showWorkEvents) {
            setShowAllEvents(false);
        }
    }, [showAllEvents, showCoachingEvents, showWorkEvents]);

    const handleShowCoachingEventsChange = useCallback((checked) => {
        setShowCoachingEvents(checked);

        if (checked && !showAllEvents) {
            setShowAllEvents(true);
            return;
        }

        if (!checked && !showTutoringEvents && !showWorkEvents) {
            setShowAllEvents(false);
        }
    }, [showAllEvents, showTutoringEvents, showWorkEvents]);

    const handleShowWorkEventsChange = useCallback((checked) => {
        setShowWorkEvents(checked);

        if (checked && !showAllEvents) {
            setShowAllEvents(true);
            return;
        }

        if (!checked && !showTutoringEvents && !showCoachingEvents) {
            setShowAllEvents(false);
        }
    }, [showAllEvents, showTutoringEvents, showCoachingEvents]);

    // Filter panel state (defined by user)
    const [filterBySubject, setFilterBySubject] = useState(null);
    const [filterByTutor, setFilterByTutor] = useState(null);
    const [filterByWorkType, setFilterByWorkType] = useState(null);
    const [filterAvailabilityByWorkType, setFilterAvailabilityByWorkType] = useState(null);

    const calendarEntities = useMemo(
        () => [
            ...calendarShifts,
            ...calendarStudentRequests,
        ],
        [calendarShifts, calendarStudentRequests],
    );

    const filteredEvents = useMemo(() => {
        let filtered = [...calendarEntities];

        if (!showAllEvents) {
            return [];
        }

        if (!showTutoringEvents) {
            filtered = filtered.filter(e => !(e.entityType === CalendarEntityType.SHIFT && e.workType === 'tutoring'));
        }

        if (!showCoachingEvents) {
            filtered = filtered.filter(e => !(e.entityType === CalendarEntityType.SHIFT && e.workType === 'coaching'));
        }

        if (!showWorkEvents) {
            filtered = filtered.filter(e => !(e.entityType === CalendarEntityType.SHIFT && e.workType === 'work'));
        }

        if (filterByTutor && filterByTutor.length > 0) {
            const selectedTutorEmails = filterByTutor.map(t => t.value);

            filtered = filtered.filter(calEvent => {
                if (calEvent.entityType === CalendarEntityType.SHIFT) {
                    return calEvent.staff?.some(s => selectedTutorEmails.includes(s.value || s));
                }

                if (calEvent.entityType === CalendarEntityType.AVAILABILITY) {
                    return selectedTutorEmails.includes(calEvent.tutor);
                }

                return true;
            });
        }

        if (hideDeniedStudentRequests) {
            filtered = filtered.filter(calEvent =>
                !(calEvent.entityType === CalendarEntityType.STUDENT_REQUEST && calEvent.approvalStatus === 'denied')
            );
        }

        if ((userRole === 'tutor' || userRole === 'coach') && showTutorInitials && !hideOwnAvailabilities) {
            let availabilities = calendarAvailabilities.filter(a => a.tutor === userEmail);

            if (filterAvailabilityByWorkType?.length > 0) {
                const selectedWorkTypes = filterAvailabilityByWorkType.map(f => f.value);

                availabilities = availabilities.filter(a =>
                    availabilityMatchesWorkTypeFilter(a, selectedWorkTypes)
                );
            }

            const splitAvailabilities = calendarAvailabilitySplit(availabilities, filtered);
            filtered = [...filtered, ...splitAvailabilities];
        }

        return filtered;
    }, [
        calendarEntities,
        showAllEvents,
        showTutoringEvents,
        showCoachingEvents,
        showWorkEvents,
        filterByTutor,
        hideDeniedStudentRequests,
        userRole,
        showTutorInitials,
        hideOwnAvailabilities,
        calendarAvailabilities,
        filterAvailabilityByWorkType,
        userEmail,
    ]);

    const filteredAvailabilities = useMemo(() => {
        if (!showTutorInitials) {
            return [];
        }

        let filtered = calendarAvailabilities;

        if (userRole === 'tutor' || userRole === 'coach') {
            if (hideOwnAvailabilities) {
                filtered = filtered.filter(a => a.tutor !== userEmail);
            } else {
                filtered = calendarAvailabilities;
            }
        }

        if (userRole === 'student' && filterBySubject) {
            const selectedSubject = subjects?.find(s => s.id === filterBySubject.value);

            if (selectedSubject?.tutors) {
                const subjectTutorEmails = selectedSubject.tutors.map(t => t.email);
                filtered = filtered.filter(a => subjectTutorEmails.includes(a.tutor));
            }
        }

        if (userRole === 'student') {
            filtered = filtered.filter(a => availabilityIsVisibleToStudent(a));
        }

        if (filterByTutor && filterByTutor.length > 0) {
            const selectedTutorEmails = filterByTutor.map(t => t.value);
            filtered = filtered.filter(a => selectedTutorEmails.includes(a.tutor));
        }

        if (filterAvailabilityByWorkType?.length > 0) {
            const selectedWorkTypes = filterAvailabilityByWorkType.map(f => f.value);

            filtered = filtered.filter(a =>
                availabilityMatchesWorkTypeFilter(a, selectedWorkTypes)
            );
        }

        return calendarAvailabilitySplit(filtered, calendarShifts);
    }, [
        showTutorInitials,
        calendarAvailabilities,
        userRole,
        hideOwnAvailabilities,
        userEmail,
        filterBySubject,
        subjects,
        filterByTutor,
        filterAvailabilityByWorkType,
        calendarShifts,
    ]);

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

            filteredEvents,
            filteredAvailabilities,

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

function getAvailabilityWorkTypes(availability) {
    if (!availability.workType) {
        return [];
    }

    if (Array.isArray(availability.workType)) {
        return availability.workType;
    }

    return [availability.workType];
}

function workTypeMatchesFilter(availabilityWorkType, selectedWorkTypes) {
    if (selectedWorkTypes.includes(availabilityWorkType)) {
        return true;
    }

    // legacy support: old availabilities may still use 'tutoringOrWork'.
    if (selectedWorkTypes.includes('tutoringOrWork')) {
        return true;
    }

    if (
        availabilityWorkType === 'tutoringOrWork' &&
        (selectedWorkTypes.includes('tutoring') || selectedWorkTypes.includes('work'))
    ) {
        return true;
    }

    return false;
}

function availabilityMatchesWorkTypeFilter(availability, selectedWorkTypes) {
    const availabilityWorkTypes = getAvailabilityWorkTypes(availability);

    for (let i = 0; i < availabilityWorkTypes.length; i++) {
        if (workTypeMatchesFilter(availabilityWorkTypes[i], selectedWorkTypes)) {
            return true;
        }
    }

    return false;
}

function availabilityIsVisibleToStudent(availability) {
    if (availability.workType == null) {
        return true;
    }

    const workTypes = getAvailabilityWorkTypes(availability);
    for (let i = 0; i < workTypes.length; i++) {
        if (workTypes[i] === 'tutoring' || workTypes[i] === 'tutoringOrWork') {
            return true;
        }
    }

    return false;
}