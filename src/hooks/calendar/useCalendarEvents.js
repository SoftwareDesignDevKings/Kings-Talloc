"use client";

import { useState, useEffect, useMemo } from 'react';
import { fetchEvents, fetchAvailabilities, fetchSubjectsWithTutors, fetchTutors, fetchStudentRequests } from '@/firestore/firebaseFetch';
import { splitAvailabilities } from '@components/calendar/availabilityUtils';

/**
 * Custom hook for managing calendar events and availabilities
 */
export const useCalendarEvents = (userRole, userEmail) => {
  const [allEvents, setAllEvents] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [studentRequests, setStudentRequests] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch data on mount and when user changes
  useEffect(() => {
    if (!userRole || !userEmail) return;

    setLoading(true);
    fetchEvents(userRole, userEmail, setAllEvents, setAllEvents, setStudents, setLoading);
    fetchAvailabilities(setAvailabilities);
    fetchStudentRequests(setStudentRequests);
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
    studentRequests,
    setStudentRequests,
    splitAvailabilitiesData,
    subjects,
    tutors,
    students,
    loading
  };
};