"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchEvents, fetchAvailabilities, fetchSubjectsWithTutors, fetchTutors } from "../firestore/firebaseFetch";
import { splitAvailabilities } from "./calendar/availabilityUtils";

/**
* CalendarDataProvider
* ---------------------
* Owns ALL data state (events, availabilities, subjects, tutors, students)
* and exposes them via a render-prop child function. This moves the data
* state out of the large parent wrapper so the child decides and manages it.
*
* Usage:
* <CalendarDataProvider userRole={userRole} userEmail={userEmail}>
* {({ allEvents, setAllEvents, availabilities, setAvailabilities, subjects, tutors, students, splitAvailabilitiesData }) => (
* // ...your calendar UI that consumes these values
* )}
* </CalendarDataProvider>
*/
const CalendarDataProvider = ({ userRole, userEmail, children }) => {
    // DATA STATE (moved down from parent)
    const [allEvents, setAllEvents] = useState([]);
    const [availabilities, setAvailabilities] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [tutors, setTutors] = useState([]);
    const [students, setStudents] = useState([]);


    useEffect(() => {
        // Fetch data once the role/email are known
        fetchEvents(userRole, userEmail, setAllEvents, setAllEvents, setStudents);
        fetchAvailabilities(setAvailabilities);
        fetchSubjectsWithTutors(setSubjects);
        fetchTutors(setTutors);

    }, [userRole, userEmail]);


    // Derive splitAvailabilities here so the parent doesn't have to
    const splitAvailabilitiesData = useMemo(() => splitAvailabilities(availabilities, allEvents), [availabilities, allEvents]);

    return children({
        allEvents,
        setAllEvents,
        availabilities,
        setAvailabilities,
        subjects,
        tutors,
        students,
        splitAvailabilitiesData,
    });
}

export default CalendarDataProvider;