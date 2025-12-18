import useCalendarStrategy from "@/hooks/useCalendarStrategy"
import useAuthSession from "@/hooks/useAuthSession"
// import { useCalendarUI } from "./CalendarUIProvider";
import useCalendarUI from "@contexts/CalendarUIContext"
/**
 * UI Provider to persist on re-renders across different page.jsx 
 */
export const CalendarUIProvider = ({ children }) => {
    const { userRole } = useAuthSession();

    const CalendarUIContext = useCalendarUI()

    // strategy-defined policy
    const calendarStrategy = useCalendarStrategy(userRole);
    const { calendarFilters, visibility } = calendarStrategy;

    // ─────────────────────────────────────
    // Visibility toggles (defaults from strategy)
    // ─────────────────────────────────────
    const [showTutorInitials, setShowTutorInitials] = useState(calendarFilters.canShowTutorInitials);

    const [hideOwnAvailabilities, setHideOwnAvailabilities] = useState(calendarFilters.canToggleAvailabilityVisibility);

    const [hideDeniedStudentRequests, setHideDeniedStudentRequests] = useState(calendarFilters.canToggleDeniedStudentRequests);

    const [showTutoringEvents, setShowTutoringEvents] = useState(true);
    const [showCoachingEvents, setShowCoachingEvents] = useState(true);

    // ─────────────────────────────────────
    // Filter panel state (user intent)
    // ─────────────────────────────────────
    const [filterBySubject, setFilterBySubject] = useState(null);

    const [filterByTutor, setFilterByTutor] = useState(calendarFilters.canFilterByTutor);

    const [filterByWorkType, setFilterByWorkType] = useState(calendarFilters.canFilterByWorkType);

    const [filterAvailabilityByWorkType, setFilterAvailabilityByWorkType] = useState(calendarFilters.canFilterAvailabilityByWorkType);

    // context values
    const value = useMemo(() => (
        {
            filters: {
                filterBySubject,
                filterByTutor,
                filterByWorkType,
                filterAvailabilityByWorkType,
            },

            visibility: {
                showTutorInitials,
                hideOwnAvailabilities,
                hideDeniedStudentRequests,
                showTutoringEvents,
                showCoachingEvents,
            },

            // strategy-defined capabilities (read-only)
            calendarFilters,
            visibilityPolicy: visibility,

            actions: {
                setFilterBySubject,
                setFilterByTutor,
                setFilterByWorkType,
                setFilterAvailabilityByWorkType,
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
            showTutorInitials,
            hideOwnAvailabilities,
            hideDeniedStudentRequests,
            showTutoringEvents,
            showCoachingEvents,
            calendarFilters,
            visibility,
        ],
    );

    return (
        <CalendarUIContext.Provider value={value}>
            {children}
        </CalendarUIContext.Provider>
    );
};
