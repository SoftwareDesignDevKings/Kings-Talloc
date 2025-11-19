"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { fetchEvents, fetchAvailabilities, fetchSubjectsWithTutors, fetchTutors, fetchStudentRequests } from '@/firestore/firebaseFetch';
import { splitAvailabilities } from '@components/calendar/availabilityUtils';
import { useEmailQueueMonitor } from '@/hooks/useEmailQueueMonitor';

const CalendarDataContext = createContext(null);

export const useCalendarData = () => {
	const context = useContext(CalendarDataContext);
	if (!context) {
		throw new Error('useCalendarData must be used within CalendarDataProvider');
	}
	return context;
};

/**
 * CalendarDataProvider
 *
 * Manages calendar data fetching and state.
 * This context rarely changes - only when events/availabilities are added/updated/deleted.
 * Keeps data separate from UI state to minimize re-renders.
 */
export const CalendarDataProvider = ({ children, userRole, userEmail }) => {
	const [allEvents, setAllEvents] = useState([]);
	const [availabilities, setAvailabilities] = useState([]);
	const [studentRequests, setStudentRequests] = useState([]);
	const [subjects, setSubjects] = useState([]);
	const [tutors, setTutors] = useState([]);
	const [students, setStudents] = useState([]);
	const [loading, setLoading] = useState(true);

	// Fetch all calendar data
	useEffect(() => {
		if (!userRole || !userEmail) return;

		setLoading(true);
		fetchEvents(userRole, userEmail, setAllEvents, setAllEvents, setStudents, setLoading);
		fetchAvailabilities(setAvailabilities);
		fetchStudentRequests(setStudentRequests);
		fetchSubjectsWithTutors(setSubjects);
		fetchTutors(setTutors);
	}, [userRole, userEmail]);

	// Split availabilities based on events (memoized)
	const splitAvailabilitiesData = useMemo(() =>
		splitAvailabilities(availabilities, allEvents),
		[availabilities, allEvents]
	);

	// Email queue monitoring (side effect for teachers)
	useEmailQueueMonitor(userRole);

	const value = useMemo(() => ({
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
		loading,
		userRole,
		userEmail
	}), [
		allEvents,
		availabilities,
		studentRequests,
		splitAvailabilitiesData,
		subjects,
		tutors,
		students,
		loading,
		userRole,
		userEmail
	]);

	return (
		<CalendarDataContext.Provider value={value}>
			{children}
		</CalendarDataContext.Provider>
	);
};
