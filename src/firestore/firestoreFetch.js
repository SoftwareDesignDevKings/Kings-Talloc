import { db } from '@/firestore/firestoreClient';
import { collection, getDocs, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { recurringCalendarExpand } from '@/utils/calendarRecurringEvents';
import { CalendarEntityType } from '@/strategy/calendarStrategy';

/**
 * Optimized Shift Fetching
 * Uses 'range' to limit reads to the currently viewed week/month.
 */
export const firestoreFetchShifts = (setCalendarShifts, calendarDateRange, strategyFbFilters) => {
    if (strategyFbFilters === null) {
        setCalendarShifts([]);
        return () => {};
    }

    const shiftsRef = collection(db, 'shifts');
    const q = query(
        shiftsRef,
        where('start', '>=', Timestamp.fromDate(calendarDateRange.start)),
        where('start', '<=', Timestamp.fromDate(calendarDateRange.end)),
        ...strategyFbFilters.map(({ fbField, fbOperation, fbValue }) => where(fbField, fbOperation, fbValue))
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
export const firestoreFetchAvailabilities = (setCalendarAvailabilities, calendarDateRange, strategyFbFilters) => {
    if (strategyFbFilters === null) {
        setCalendarAvailabilities([]);
        return () => {};
    }

    const availabilitiesRef = collection(db, 'tutorAvailabilities');
    const q = query(
        availabilitiesRef,
        where('start', '>=', Timestamp.fromDate(calendarDateRange.start)),
        where('start', '<=', Timestamp.fromDate(calendarDateRange.end)),
        ...strategyFbFilters.map(({ fbField, fbOperation, fbValue }) => where(fbField, fbOperation, fbValue))
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
export const firestoreFetchStudentRequests = (setCalendarStudentRequests, calendarDateRange, strategyFbFilters) => {
    if (strategyFbFilters === null) {
        setCalendarStudentRequests([]);
        return () => {};
    }

    const requestsRef = collection(db, 'studentEventRequests');
    const q = query(
        requestsRef,
        where('start', '>=', Timestamp.fromDate(calendarDateRange.start)),
        where('start', '<=', Timestamp.fromDate(calendarDateRange.end)),
        ...strategyFbFilters.map(({ fbField, fbOperation, fbValue }) => where(fbField, fbOperation, fbValue))
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

/**
 * Fetch tutors for dropdowns (one-time)
 */
export const firestoreFetchTutors = async (setTutors) => {
    try {
        const usersRef = collection(db, 'users');
        const tutorsQuery = query(usersRef, where('role', '==', 'tutor'));
        const snapshot = await getDocs(tutorsQuery);

        let tutors = [];
        tutors = snapshot.docs.map((doc) => {
            const data = doc.data();

            return {
                email: data.email,
                name: data.name || data.email,  // Use name field if available, fallback to email
            };
        });

        setTutors(tutors);
    } catch (error) {
        console.error('Error fetching tutors:', error);
        setTutors([]);
    }
};


/**
 * Fetch subjects with associated tutors (one-time)
 */
export const firestoreFetchSubjects = async (setSubjects) => {
    try {
        const subjectsRef = collection(db, 'subjects');
        const snapshot = await getDocs(subjectsRef);

        let subjects = [];

        subjects = snapshot.docs.map((doc) => {
            const data = doc.data();

            return {
                id: doc.id,
                name: data.name,
                tutors: data.tutors || [],
            };
        });

        setSubjects(subjects);
    } catch (error) {
        console.error('Error fetching subjects:', error);
        setSubjects([]);
    }
};

/**
 * Fetch classes for dropdowns / visibility logic (one-time)
 * @param {Function} setClasses
 */
export const firestoreFetchClasses = async (setClasses) => {
    try {
        const classesRef = collection(db, 'classes');
        const snapshot = await getDocs(classesRef);

        let classes = [];

        classes = snapshot.docs.map((doc) => {
            const data = doc.data();

            return {
                id: doc.id,
                ...data,
            };
        });

        setClasses(classes);
    } catch (error) {
        console.error('Error fetching classes:', error);
        setClasses([]);
    }
};

/**
 * Fetch students for dropdowns (one-time)
 * @param {Function} setStudents
 */
export const firestoreFetchStudents = async (setStudents) => {
    try {
        const studentsRef = collection(db, 'students');
        const snapshot = await getDocs(studentsRef);

        const students = snapshot.docs.map((doc) => {
            const data = doc.data();

            return {
                email: data.email,
                name: data.name || data.email,
            };
        });

        setStudents(students);
    } catch (error) {
        console.error('Error fetching students:', error);
        setStudents([]);
    }
};