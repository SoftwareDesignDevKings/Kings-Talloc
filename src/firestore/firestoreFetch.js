import { db } from '@/firestore/firestoreClient';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { recurringCalendarExpand } from '@/utils/calendarRecurringEvents';
import { CalendarEntityType } from '@/strategy/calendarStrategy';

/**
 * Optimized Shift Fetching
 * Uses 'range' to limit reads to the currently viewed week/month.
 */
export const firestoreFetchShifts = (setCalendarShifts, calendarDateRange) => {
    const shiftsRef = collection(db, 'shifts');
    
    // Create query using the calendarDateRange (start and end timestamps)
    const q = query(
        shiftsRef,
        where('start', '>=', Timestamp.fromDate(calendarDateRange.start)),
        where('start', '<=', Timestamp.fromDate(calendarDateRange.end))
    );

    return onSnapshot(q, (snapshot) => {
        let shifts = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                start: data.start.toDate(),
                end: data.end.toDate(),
                ...(data.until && { until: data.until.toDate() }),
                entityType: CalendarEntityType.SHIFT,
            };
        });

        // Expand recurring events only within the current view calendarDateRange
        const RECURRING_MAX = 10
        shifts = recurringCalendarExpand(shifts, {
            rangeStart: calendarDateRange.start,
            rangeEnd: calendarDateRange.end,
            maxOccurrences: RECURRING_MAX, 
        });

        setCalendarShifts(shifts);
    }, (error) => {
        console.error("Firestore Shifts Error:", error);
        setCalendarShifts([]);
    });
};

/**
 * Optimized Availabilities Fetching
 */
export const firestoreFetchAvailabilities = (setCalendarAvailabilities, calendarDateRange) => {
    const availabilitiesRef = collection(db, 'tutorAvailabilities');
    
    const q = query(
        availabilitiesRef,
        where('start', '>=', Timestamp.fromDate(calendarDateRange.start)),
        where('start', '<=', Timestamp.fromDate(calendarDateRange.end))
    );

    return onSnapshot(q, (snapshot) => {
        const availabilities = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                start: data.start.toDate(),
                end: data.end.toDate(),
                entityType: CalendarEntityType.AVAILABILITY,
            };
        });
        setCalendarAvailabilities(availabilities);
    }, (error) => {
        console.error("Firestore Availabilities Error:", error);
        setCalendarAvailabilities([]);
    });
};

/**
 * Optimized Student Requests Fetching
 */
export const firestoreFetchStudentRequests = (setCalendarStudentRequests, calendarDateRange) => {
    const requestsRef = collection(db, 'studentEventRequests');
    
    const q = query(
        requestsRef,
        where('start', '>=', Timestamp.fromDate(calendarDateRange.start)),
        where('start', '<=', Timestamp.fromDate(calendarDateRange.end))
    );

    return onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                start: data.start.toDate(),
                end: data.end.toDate(),
                entityType: CalendarEntityType.STUDENT_REQUEST,
            };
        });
        setCalendarStudentRequests(requests);
    }, (error) => {
        console.error("Firestore Requests Error:", error);
        setCalendarStudentRequests([]);
    });
};