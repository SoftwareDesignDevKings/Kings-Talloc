import { useState, useMemo } from "react";
import useCalendarStrategy from "@/hooks/useCalendarStrategy"
import useAuthSession from "@/hooks/useAuthSession"
import CalendarUIContext from "@contexts/CalendarUIContext"
import { useCalendarData } from "@/providers/CalendarDataProvider"
import { CalendarEntityType } from "@/strategy/calendarStrategy"
import { calendarAvailabilitySplit } from "@/utils/calendarAvailability"

/**
 * UI Provider to persist on re-renders across different page.jsx
 */
export const CalendarUIProvider = ({ children }) => {
    const { session, userRole } = useAuthSession();
    const userEmail = session?.user?.email;

    // Get calendar data
    const { calendarShifts, calendarAvailabilities, calendarStudentRequests, subjects } = useCalendarData();

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
            ...calendarAvailabilities,
            ...calendarStudentRequests,
        ],
        [calendarShifts, calendarAvailabilities, calendarStudentRequests],
    );

    // Filter RBC events by panel controls
    const filteredEvents = useMemo(() => {
        let filtered = calendarEntities.filter((calEvent) => {
            // skip availabilities for tutors and students - shown as overlays only
            if (calEvent.entityType === CalendarEntityType.AVAILABILITY) {
                // Only tutors can see their own availabilities as RBC events (added back later)
                if (userRole !== 'tutor') {
                    return false;
                }
                // for tutors, we'll handle them separately
                return false;
            }
            return calendarStrategy.visibility.includeInCalendar(calEvent);
        });

        // apply "Show All Events" toggle
        if (!showAllEvents) {
            return [];
        }

        // filter by tutoring/coaching work type 
        if (!showTutoringEvents) {
            filtered = filtered.filter(e => !(e.entityType === CalendarEntityType.SHIFT && e.workType === 'tutoring'));
        }
        if (!showCoachingEvents) {
            filtered = filtered.filter(e => !(e.entityType === CalendarEntityType.SHIFT && e.workType === 'coaching'));
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

        // hide denied student requests from CalendarUIProvider
        if (hideDeniedStudentRequests) {
            filtered = filtered.filter(calEvent =>
                !(calEvent.entityType === CalendarEntityType.STUDENT_REQUEST && calEvent.approvalStatus === 'denied')
            );
        }

        // for tutors: include their own availabilities as RBC events (unless hidden)
        if (userRole === 'tutor' && !hideOwnAvailabilities) {
            let tutorOwnAvailabilities = calendarAvailabilities.filter((avail) => avail.tutor === userEmail);

            if (filterAvailabilityByWorkType) {
                tutorOwnAvailabilities = tutorOwnAvailabilities.filter(
                    (a) => a.workType === filterAvailabilityByWorkType.value
                );
            }
            // split tutor's own availabilities around their shifts 
            const splitTutorAvailabilities = calendarAvailabilitySplit(tutorOwnAvailabilities, filtered);
            filtered = [...filtered, ...splitTutorAvailabilities];
        }

        return filtered;
    }, [calendarEntities, calendarStrategy.visibility, showAllEvents, showTutoringEvents, showCoachingEvents, filterByTutor, hideDeniedStudentRequests, userRole, hideOwnAvailabilities, calendarAvailabilities, userEmail, filterAvailabilityByWorkType]);

    // ─────────────────────────────────────
    // Filter availabilities by panel controls
    // ─────────────────────────────────────
    const filteredAvailabilities = useMemo(() => {

        // check strategy-level and CalendarUIProvider visibility settings
        if (!showTutorInitials) {
            return [];
        }

        let filtered = calendarAvailabilities;

        // tutors: hide own availabilities if CalendarUIProvider setting is enabled
        if (userRole === 'tutor') {
            if (hideOwnAvailabilities) {
                filtered = filtered.filter((a) => a.tutor !== userEmail);
            } else {
                // Show all availabilities including own
                filtered = calendarAvailabilities;
            }
        }

        // students: filter by selected subject's tutors from CalendarUIProvider
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

        // filter by selected tutors from CalendarUIProvider
        if (filterByTutor && filterByTutor.length > 0) {
            const selectedTutorEmails = filterByTutor.map(t => t.value);
            filtered = filtered.filter(a => selectedTutorEmails.includes(a.tutor));
        }

        // filter by availability work type from CalendarUIProvider
        if (filterAvailabilityByWorkType) {
            const workType = filterAvailabilityByWorkType.value;
            filtered = filtered.filter(a => a.workType === workType);
        }

        // Split availabilities around clashing shifts
        const splitAvailabilities = calendarAvailabilitySplit(filtered, filteredEvents);

        return splitAvailabilities;
    }, [showTutorInitials, calendarAvailabilities, userRole, hideOwnAvailabilities, userEmail, filterBySubject, subjects, filterByTutor, filterAvailabilityByWorkType, filteredEvents]);

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
                setShowAllEvents,
                setShowTutorInitials,
                setHideOwnAvailabilities,
                setHideDeniedStudentRequests,
                setShowTutoringEvents,
                setShowCoachingEvents,
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
            filteredEvents,
            filteredAvailabilities,
            calendarFilters,
            calendarScope,
        ],
    );

    return (
        <CalendarUIContext.Provider value={value}>
            {children}
        </CalendarUIContext.Provider>
    );
};
