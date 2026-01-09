'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    firestoreFetchShifts,
    firestoreFetchAvailabilities,
    firestoreFetchStudentRequests,
    firestoreFetchTutors,
    firestoreFetchClasses,
    firestoreFetchSubjects,
    firestoreFetchStudents
} from '@/firestore/firestoreFetch';
// import { calendarAvailabilitySplit } from '@/utils/calendarAvailability';
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
    const [calendarShifts, setCalendarShifts] = useState([])
    const [calendarAvailabilities, setCalendarAvailabilities] = useState([])
    const [calendarStudentRequests, setCalendarStudentRequests] = useState([])

    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [tutors, setTutors] = useState([]);
    const [classes, setClasses] = useState([]);

    useEffect(() => {
        const unsubShifts = firestoreFetchShifts(setCalendarShifts)
        const unsubAvailabilities = firestoreFetchAvailabilities(setCalendarAvailabilities)
        const unsubtStudenRequests = firestoreFetchStudentRequests(setCalendarStudentRequests)


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
    }, [])


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
