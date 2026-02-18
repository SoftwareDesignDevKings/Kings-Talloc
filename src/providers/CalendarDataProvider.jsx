'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

import CalendarDataContext from '@/contexts/CalendarDataContext';
export { useCalendarData } from '@/contexts/CalendarDataContext';

/**
 * CalendarDataProvider
 *
 * Manages calendar data fetching and state.
 * This context rarely changes - only when events/availabilities are added/updated/deleted.
 * Keeps data separate from UI state to minimize re-renders.
 */
export const CalendarDataProvider = ({ children }) => {
    const { session, userRole, userRoles } = useAuthSession();
    const userEmail = session?.user?.email;
    const calendarStrategy = useCalendarStrategy(userEmail, userRole, userRoles);

    // raw data buckets from Firestore listeners - 
    const [oneOffShifts, setOneOffShifts] = useState([]);
    const [recurringBaseShifts, setRecurringBaseShifts] = useState([]);

    const [calendarShifts, setCalendarShifts] = useState([]);
    const [calendarAvailabilities, setCalendarAvailabilities] = useState([]);
    const [calendarStudentRequests, setCalendarStudentRequests] = useState([]);

    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [tutors, setTutors] = useState([]);
    const [classes, setClasses] = useState([]);

    const [calendarDateRange, setCalendarDateRange] = useState({
        start: startOfWeek(new Date(), { weekStartsOn: 1 }),
        end: endOfWeek(new Date(), { weekStartsOn: 1 }),
    });

    // debounce the date range so rapid week navigation doesn't fire sub / unsub fb snapshots - reduce fb reads
    const [debouncedDateRange, setDebouncedDateRange] = useState(calendarDateRange);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedDateRange(calendarDateRange), 300);
        return () => clearTimeout(timer);
    }, [calendarDateRange]);

    // effect 1
    // recompute calendarShifts whenever either source or the visible range changes.
    useEffect(() => {
        setCalendarShifts(
            recurringCalendarExpand([...oneOffShifts, ...recurringBaseShifts], {
                rangeStart: debouncedDateRange.start,
                rangeEnd: debouncedDateRange.end,
                maxOccurrences: 10,
            })
        );
    }, [oneOffShifts, recurringBaseShifts, debouncedDateRange]);

    // persistent recurring shifts listener.
    // Only re-subscribes when user/role changes, not on week navigation.
    useEffect(() => {
        if (!userEmail || !calendarStrategy.firestoreConstraints) return;
        const unsub = firestoreFetchRecurringShifts(
            setRecurringBaseShifts,
            calendarStrategy.firestoreConstraints.shifts()
        );
        return () => unsub();
    }, [userEmail, userRole]);

    // Effect 2: Date-range listeners — re-subscribes on week navigation (debounced).
    useEffect(() => {
        if (!userEmail || !calendarStrategy.firestoreConstraints) return;
        const { firestoreConstraints } = calendarStrategy;

        const unsubOneOff = firestoreFetchOneOffShifts(setOneOffShifts, debouncedDateRange, firestoreConstraints.shifts());
        const unsubAvail = firestoreFetchAvailabilities(setCalendarAvailabilities, debouncedDateRange, firestoreConstraints.availabilities());
        const unsubRequests = firestoreFetchStudentRequests(setCalendarStudentRequests, debouncedDateRange, firestoreConstraints.studentRequests());

        return () => {
            unsubOneOff();
            unsubAvail();
            unsubRequests();
        };
    }, [debouncedDateRange, userEmail, userRole]);

    // effect 3: Static reference data — only re-fetches when user/role changes.
    useEffect(() => {
        if (!userEmail) return;
        const loadReferenceData = async () => {
            const [tutorList, classList, subjectList, studentList] = await Promise.all([
                fetchCacheTutors(),
                fetchCacheClasses(),
                fetchCacheSubjects(),
                fetchCacheStudents(),
            ]);
            setTutors(tutorList);
            setClasses(classList);
            setSubjects(subjectList);
            setStudents(studentList);
        };
        loadReferenceData().catch((error) => console.error('Error loading reference data:', error));
    }, [userEmail, userRole]);

    const contextValues = useMemo(() => ({
        // calendar streams (real-time)
        calendarShifts,
        setCalendarShifts,
        calendarAvailabilities,
        setCalendarAvailabilities,
        calendarStudentRequests,
        setCalendarStudentRequests,

        // reference data (one-time fetch)
        classes,
        subjects,
        tutors,
        students,

        // date range
        setCalendarDateRange
    }), [
        calendarShifts,
        calendarAvailabilities,
        calendarStudentRequests,
        classes,
        subjects,
        tutors,
        students,
    ]);

    return (
        <CalendarDataContext.Provider value={contextValues}>
            {children}
        </CalendarDataContext.Provider>
    );
};
