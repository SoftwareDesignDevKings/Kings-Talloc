import { db } from '@/firestore/firestoreClient';
import { collection, getDocs, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { recurringCalendarExpand } from '@/utils/calendarRecurringEvents';
import { CalendarEntityType } from '@/strategy/calendarStrategy';

/**
 * Optimized Shift Fetching
 * Uses two queries:
 *   1. Non-recurring shifts within the viewed date range
 *   2. ALL recurring shifts (no date filter) — expanded in memory so navigating
 *      to a future/past week still shows occurrences whose base event is outside
 *      the current view window.
 */
export const firestoreFetchShifts = (setCalendarShifts, calendarDateRange, strategyFbFilters) => {
    if (strategyFbFilters === null) {
        setCalendarShifts([]);
        return () => {};
    }

    const shiftsRef = collection(db, 'shifts');
    const MAX_OCCURRENCES = 10;
    const accessFilters = strategyFbFilters.map(({ fbField, fbOperation, fbValue }) =>
        where(fbField, fbOperation, fbValue)
    );

    // pending buckets — null signals "listener hasn't fired yet"
    let oneOffShifts = null;
    let recurringBaseShifts = null;

    const publishShifts = () => {
        if (oneOffShifts === null || recurringBaseShifts === null) return;
        const expanded = recurringCalendarExpand([...oneOffShifts, ...recurringBaseShifts], {
            rangeStart: calendarDateRange.start,
            rangeEnd: calendarDateRange.end,
            maxOccurrences: MAX_OCCURRENCES,
        });

        setCalendarShifts(expanded);
    };

    const deserializeShift = (doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            start: data.start.toDate(),
            end: data.end.toDate(),
            ...(data.until && { until: data.until.toDate() }),
            entityType: CalendarEntityType.SHIFT,
        };
    };

    // Query 1: currWeek shifts within the viewed date range
    const currWeekQuery = query(
        shiftsRef,
        where('start', '>=', Timestamp.fromDate(calendarDateRange.start)),
        where('start', '<=', Timestamp.fromDate(calendarDateRange.end)),
        where('recurring', '==', null),
        ...accessFilters
    );

    // Query 2: ALL recurring base shifts — no date filter so occurrences whose
    // base event falls outside the current view are still expanded in memory
    const recurringQuery = query(
        shiftsRef,
        where('recurring', 'in', ['weekly', 'fortnightly']),
        ...accessFilters
    );

    const unsubscribeOneOff = onSnapshot(currWeekQuery, (snapshot) => {
        oneOffShifts = snapshot.docs.map(deserializeShift);
        publishShifts();
    }, (error) => {
        console.error("Firestore Shifts (one-off) Error:", error);
        oneOffShifts = [];
        publishShifts();
    });

    const unsubscribeRecurring = onSnapshot(recurringQuery, (snapshot) => {
        recurringBaseShifts = snapshot.docs.map(deserializeShift);
        publishShifts();
    }, (error) => {
        console.error("Firestore Shifts (recurring) Error:", error);
        recurringBaseShifts = [];
        publishShifts();
    });

    return () => {
        unsubscribeOneOff();
        unsubscribeRecurring();
    };
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