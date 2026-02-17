'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { startOfWeek, endOfWeek  } from 'date-fns';
import {
    firestoreFetchShifts,
    firestoreFetchAvailabilities,
    firestoreFetchStudentRequests,
    firestoreFetchTutors,
    firestoreFetchClasses,
    firestoreFetchSubjects,
    firestoreFetchStudents
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

    const [calendarShifts, setCalendarShifts] = useState([])
    const [calendarAvailabilities, setCalendarAvailabilities] = useState([])
    const [calendarStudentRequests, setCalendarStudentRequests] = useState([])

    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [tutors, setTutors] = useState([]);
    const [classes, setClasses] = useState([]);

    const [calendarDateRange, setCalendarDateRange] = useState({
        start: startOfWeek(new Date(), { weekStartsOn: 1 }), // 1 = Monday
        end: endOfWeek(new Date(), { weekStartsOn: 1 })
    });

    // only rerun the fetches once RBC week changes or user/strategy changes
    useEffect(() => {
        if (!userEmail || !calendarStrategy.firestoreConstraints) return;

        const { firestoreConstraints } = calendarStrategy;

        const unsubShifts = firestoreFetchShifts(setCalendarShifts, calendarDateRange, firestoreConstraints.shifts())
        const unsubAvailabilities = firestoreFetchAvailabilities(setCalendarAvailabilities, calendarDateRange, firestoreConstraints.availabilities())
        const unsubtStudenRequests = firestoreFetchStudentRequests(setCalendarStudentRequests, calendarDateRange, firestoreConstraints.studentRequests())

        firestoreFetchTutors(setTutors)
        firestoreFetchClasses(setClasses)
        firestoreFetchSubjects(setSubjects)
        firestoreFetchStudents(setStudents);

        return () => {
            // disconnect snapshots (real time listeners)
            unsubShifts()
            unsubAvailabilities()
            unsubtStudenRequests()
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calendarDateRange, userEmail, userRole])


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
        <CalendarDataContext.Provider
            value={contextValues}
        >
            {children}
        </CalendarDataContext.Provider>
    );
};
