'use client';
import useBookableAvailability from '@/hooks/useBookableAvailability';

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { startOfWeek, endOfWeek } from 'date-fns';
import { recurringCalendarExpand } from '@/utils/calendarRecurringEvents';
import {
    firestoreFetchOneOffShifts,
    firestoreFetchRecurringShifts,
    firestoreFetchAvailabilities,
    firestoreFetchStudentRequests,
    fetchCacheTutors,
    fetchCacheClasses,
    fetchCacheSubjects,
    fetchStudentTutorEligibility,
} from '@/firestore/firestoreFetch';
import useAuthSession from '@/hooks/useAuthSession';
import useCalendarStrategy from '@/hooks/useCalendarStrategy';

/**
 * Context for global app data (events, availabilities, subjects, tutors, etc.)
 * Manages data fetching and state.
 * This context rarely changes - only when events/availabilities are added/updated/deleted.
 */
export const AppDataContext = createContext(null);

export const useAppData = () => {
    const context = useContext(AppDataContext);
    if (!context) {
        throw new Error('useAppData must be used within AppDataContextProvider');
    }
    return context;
};

const fetchReferenceDataSafely = async (label, fetchFn, fallback) => {
    try {
        return await fetchFn();
    } catch (error) {
        console.error(`Error loading ${label}:`, error);
        return fallback;
    }
};

/**
 * AppDataContextProvider
 *
 * Manages global application data fetching and state.
 * This context rarely changes - only when events/availabilities are added/updated/deleted.
 * Keeps data separate from UI state to minimize re-renders.
 */
export const AppDataContextProvider = ({ children }) => {
    const { session, userRole } = useAuthSession();
    const userEmail = session?.user?.email;
    const calendarStrategy = useCalendarStrategy(userEmail, userRole);
    const canReadCanvasReferenceData = userRole === 'admin' || userRole === 'teacher';

    // Raw data buckets from Firestore listeners
    const [oneOffShifts, setOneOffShifts] = useState([]);
    const [recurringBaseShifts, setRecurringBaseShifts] = useState([]);

    // Derived merged+expanded state — also accepts direct sets for optimistic updates
    const [appShifts, setAppShifts] = useState([]);
    const [appAvailabilities, setAppAvailabilities] = useState([]);
    const [appStudentRequests, setAppStudentRequests] = useState([]);

    const [subjects, setSubjects] = useState([]);
    const [tutors, setTutors] = useState([]);
    const [classes, setClasses] = useState([]);
    const [studentTutorEligibility, setStudentTutorEligibility] = useState({
        coverageKeys: [],
        eligibleTutorEmails: [],
        eligibleTutors: [],
    });

    const [appDateRange, setAppDateRange] = useState({
        start: startOfWeek(new Date(), { weekStartsOn: 1 }),
        end: endOfWeek(new Date(), { weekStartsOn: 1 }),
    });

    // Only views that show bookable slots (the calendar) poll for them; other pages
    // would otherwise re-read every tutor's schedule for each open student tab.
    const [availabilityViewers, setAvailabilityViewers] = useState(0);
    const watchBookableAvailability = useCallback(() => {
        setAvailabilityViewers(count => count + 1);
        return () => setAvailabilityViewers(count => count - 1);
    }, []);
    const bookableAvailability = useBookableAvailability(userEmail, userRole === 'student' && availabilityViewers > 0, appDateRange, { pollMs: 60000 });

    // Debounce the date range so rapid week navigation doesn't fire multiple subscriptions
    const [debouncedDateRange, setDebouncedDateRange] = useState(appDateRange);

    // Calendar listeners start when a view that shows them (calendar, dashboard) first
    // mounts, then stay attached: re-subscribing re-reads every matching document.
    // Pages such as Classes or Tutor Hours never start them.
    const [calendarDataWanted, setCalendarDataWanted] = useState(false);
    const watchCalendarData = useCallback((initialRange) => {
        if (initialRange) {
            // Subscribe with the viewer's range straight away rather than the default week.
            setAppDateRange(initialRange);
            setDebouncedDateRange(initialRange);
        }
        setCalendarDataWanted(true);
    }, []);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedDateRange(appDateRange), 300);
        return () => clearTimeout(timer);
    }, [appDateRange]);

    // Recompute appShifts whenever either source or the visible range changes.
    // setAppShifts is still exposed for optimistic updates — the next snapshot will correct it.
    useEffect(() => {
        setAppShifts(
            recurringCalendarExpand([...oneOffShifts, ...recurringBaseShifts], {
                rangeStart: debouncedDateRange.start,
                rangeEnd: debouncedDateRange.end,
                maxOccurrences: 10,
            })
        );
    }, [oneOffShifts, recurringBaseShifts, debouncedDateRange]);

    // Effect 1: Persistent recurring shifts listener.
    // Only re-subscribes when user/role changes, not on week navigation.
    useEffect(() => {
        if (!calendarDataWanted || !userEmail || !calendarStrategy.firestoreConstraints) return;
        const unsub = firestoreFetchRecurringShifts(
            setRecurringBaseShifts,
            calendarStrategy.firestoreConstraints.shifts()
        );
        return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calendarDataWanted, userEmail, userRole]);

    // Effect 2: Date-range listeners — re-subscribes on week navigation (debounced).
    // Also loads static reference data on user/role change.
    useEffect(() => {
        if (!calendarDataWanted || !userEmail || !calendarStrategy.firestoreConstraints) return;
        const { firestoreConstraints } = calendarStrategy;

        const unsubOneOff = firestoreFetchOneOffShifts(setOneOffShifts, debouncedDateRange, firestoreConstraints.shifts());
        const unsubAvail = firestoreFetchAvailabilities(setAppAvailabilities, debouncedDateRange, firestoreConstraints.availabilities());
        const unsubRequests = firestoreFetchStudentRequests(setAppStudentRequests, debouncedDateRange, firestoreConstraints.studentRequests());

        return () => {
            unsubOneOff();
            unsubAvail();
            unsubRequests();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calendarDataWanted, debouncedDateRange, userEmail, userRole]);

    // Effect 3: Static reference data — only re-fetches when user/role changes.
    useEffect(() => {
        if (!userEmail) return;
        const loadReferenceData = async () => {
            const [tutorList, classList, subjectList] = await Promise.all([
                fetchReferenceDataSafely('tutors', fetchCacheTutors, []),
                canReadCanvasReferenceData
                    ? fetchReferenceDataSafely('classes', fetchCacheClasses, [])
                    : Promise.resolve([]),
                fetchReferenceDataSafely('subjects', fetchCacheSubjects, []),
            ]);
            setTutors(tutorList);
            setClasses(classList);
            setSubjects(subjectList);

            if (userRole === 'student') {
                const eligibility = await fetchReferenceDataSafely(
                    'student tutor eligibility',
                    () => fetchStudentTutorEligibility(userEmail),
                    { coverageKeys: [], eligibleTutorEmails: [], eligibleTutors: [] }
                );
                setStudentTutorEligibility(eligibility);
            } else {
                setStudentTutorEligibility({ coverageKeys: [], eligibleTutorEmails: [], eligibleTutors: [] });
            }
        };
        loadReferenceData().catch((error) => console.error('Error loading reference data:', error));
    }, [userEmail, userRole, canReadCanvasReferenceData]);

    const contextValues = useMemo(() => ({
        // calendar streams (real-time)
        calendarShifts: appShifts,
        setCalendarShifts: setAppShifts,
        calendarAvailabilities: appAvailabilities,
        setCalendarAvailabilities: setAppAvailabilities,
        calendarStudentRequests: appStudentRequests,
        setCalendarStudentRequests: setAppStudentRequests,

        // reference data (one-time fetch)
        classes,
        subjects,
        tutors,
        studentTutorEligibility,
        bookableAvailability,
        watchBookableAvailability,
        watchCalendarData,

        // date range
        calendarDateRange: appDateRange,
        setCalendarDateRange: setAppDateRange,
    }), [
        appShifts,
        appAvailabilities,
        appStudentRequests,
        classes,
        subjects,
        tutors,
        studentTutorEligibility,
        bookableAvailability,
        appDateRange,
    ]);

    return (
        <AppDataContext.Provider value={contextValues}>
            {children}
        </AppDataContext.Provider>
    );
};
