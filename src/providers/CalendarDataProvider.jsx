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
import { useEmailQueueMonitor } from '@/hooks/useEmailQueueMonitor';
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
    const [calendarShifts, setCalendarShifts] = useState([])
    const [calendarAvailabilities, setCalendarAvailabilities] = useState([])
    const [calendarStudentRequests, setCalendarStudentRequests] = useState([])

    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [tutors, setTutors] = useState([]);
    const [classes, setClasses] = useState([]);

    const { userRole } = useAuthSession();

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

    useEmailQueueMonitor(userRole);

    return (
        <CalendarDataContext.Provider
            value={{

                // TODO: useMemo() to memoise for optimise re-render
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
            }}
        >
            {children}
        </CalendarDataContext.Provider>
    );
};

    // const { session, userRole } = useAuthSession();
    // const userEmail = session?.user?.email;
    // const [allEvents, setAllEvents] = useState([]);
    // const [availabilities, setAvailabilities] = useState([]);
    // const [studentRequests, setStudentRequests] = useState([]);
    // const [subjects, setSubjects] = useState([]);
    // const [tutors, setTutors] = useState([]);
    // const [students, setStudents] = useState([]);
    // const [loading, setLoading] = useState(true);

    // // Fetch all calendar data
    // useEffect(() => {
    //     if (!userRole || !userEmail) return;

    //     setLoading(true);
    //     firestoreFetchShifts(
    //         userRole,
    //         userEmail,
    //         setAllEvents,
    //         setAllEvents,
    //         setStudents,
    //         setLoading,
    //     );
    //     firestoreFetchAvailabilities(setAvailabilities);
    //     firestoreFetchStudentRequests(setStudentRequests);
    //     firestoreFetchSubjectsWithTutors(setSubjects);
    //     firestoreFetchTutors(setTutors);
    // }, [userRole, userEmail]);

    // // Split availabilities based on events (memoized)
    // const splitAvailabilitiesData = useMemo(
    //     () => calendarAvailabilitySplit(availabilities, allEvents),
    //     [availabilities, allEvents],
    // );

    // // Email queue monitoring (side effect for teachers)
    // useEmailQueueMonitor(userRole);

    // const value = useMemo(
    //     () => ({
    //         allEvents,
    //         setAllEvents,
    //         availabilities,
    //         setAvailabilities,
    //         studentRequests,
    //         setStudentRequests,
    //         splitAvailabilitiesData,
    //         subjects,
    //         tutors,
    //         students,
    //         loading,
    //         userRole,
    //         userEmail,
    //     }),
    //     [
    //         allEvents,
    //         availabilities,
    //         studentRequests,
    //         splitAvailabilitiesData,
    //         subjects,
    //         tutors,
    //         students,
    //         loading,
    //         userRole,
    //         userEmail,
    //     ],
    // );

    // return (
	// 	<CalendarDataContext.Provider value={value}>
	// 		{children}
	// 	</CalendarDataContext.Provider>
	// );
