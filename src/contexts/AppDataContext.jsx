'use client';

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
    fetchCacheStudents,
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

/**
 * AppDataContextProvider
 *
 * Manages global application data fetching and state.
 * This context rarely changes - only when events/availabilities are added/updated/deleted.
 * Keeps data separate from UI state to minimize re-renders.
 */
export const AppDataContextProvider = ({ children }) => {
    const { session, userRole, userRoles } = useAuthSession();
    const userEmail = session?.user?.email;
    const calendarStrategy = useCalendarStrategy(userEmail, userRole, userRoles);

    // Raw data buckets from Firestore listeners
    const [oneOffShifts, setOneOffShifts] = useState([]);
    const [recurringBaseShifts, setRecurringBaseShifts] = useState([]);

    // Derived merged+expanded state — also accepts direct sets for optimistic updates
    const [appShifts, setAppShifts] = useState([]);
    const [appAvailabilities, setAppAvailabilities] = useState([]);
    const [appStudentRequests, setAppStudentRequests] = useState([]);

    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [tutors, setTutors] = useState([]);
    const [classes, setClasses] = useState([]);

    const [appDateRange, setAppDateRange] = useState({
        start: startOfWeek(new Date(), { weekStartsOn: 1 }),
        end: endOfWeek(new Date(), { weekStartsOn: 1 }),
    });

    // Debounce the date range so rapid week navigation doesn't fire multiple subscriptions
    const [debouncedDateRange, setDebouncedDateRange] = useState(appDateRange);
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
        if (!userEmail || !calendarStrategy.firestoreConstraints) return;
        const unsub = firestoreFetchRecurringShifts(
            setRecurringBaseShifts,
            calendarStrategy.firestoreConstraints.shifts()
        );
        return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userEmail, userRole]);

    // Effect 2: Date-range listeners — re-subscribes on week navigation (debounced).
    // Also loads static reference data on user/role change.
    useEffect(() => {
        if (!userEmail || !calendarStrategy.firestoreConstraints) return;
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
    }, [debouncedDateRange, userEmail, userRole]);

    // Effect 3: Static reference data — only re-fetches when user/role changes.
    useEffect(() => {
        if (!userEmail) return;
        const loadReferenceData = async () => {
            const [tutorList, classList, subjectList] = await Promise.all([
                fetchCacheTutors(),
                fetchCacheClasses(),
                fetchCacheSubjects(),
            ]);
            setTutors(tutorList);
            setClasses(classList);
            setSubjects(subjectList);

            // students only needed by roles that manage them (tutors, admins)
            if (userRole !== 'student') {
                const studentList = await fetchCacheStudents();
                setStudents(studentList);
            }
        };
        loadReferenceData().catch((error) => console.error('Error loading reference data:', error));
    }, [userEmail, userRole]);

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
        students,

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
        students,
        appDateRange,
    ]);

    return (
        <AppDataContext.Provider value={contextValues}>
            {children}
        </AppDataContext.Provider>
    );
};
