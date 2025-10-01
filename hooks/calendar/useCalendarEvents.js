"use client";

import { useState, useEffect, useMemo } from 'react';
import { fetchEvents, fetchAvailabilities, fetchSubjectsWithTutors, fetchTutors } from '@firebase/fetchData';
import { splitAvailabilities } from '@components/calendar/availabilityUtils';

/**
 * Custom hook for managing calendar events and availabilities
 */
export const useCalendarEvents = (userRole, userEmail) => {
  const [allEvents, setAllEvents] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [students, setStudents] = useState([]);

  // Fetch data on mount and when user changes
  useEffect(() => {
    fetchEvents(userRole, userEmail, setAllEvents, setAllEvents, setStudents);
    fetchAvailabilities(setAvailabilities);
    fetchSubjectsWithTutors(setSubjects);
    fetchTutors(setTutors);
  }, [userRole, userEmail]);

  // Split availabilities based on events
  const splitAvailabilitiesData = useMemo(() =>
    splitAvailabilities(availabilities, allEvents),
    [availabilities, allEvents]
  );

  return {
    allEvents,
    setAllEvents,
    availabilities,
    setAvailabilities,
    splitAvailabilitiesData,
    subjects,
    tutors,
    students
  };
};