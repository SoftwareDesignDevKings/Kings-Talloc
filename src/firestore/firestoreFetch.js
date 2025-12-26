import { db } from '@/firestore/firestoreClient';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { recurringCalendarExpand } from '@/utils/calendarRecurringEvents';
import { addWeeks } from 'date-fns';
import { CalendarEntityType } from '@/strategy/calendarStrategy';

export const firestoreFetchShifts = (setCalendarShifts) => {
    const shiftsRef = collection(db, 'shifts');

    return onSnapshot(shiftsRef, (snapshot) => {
        let shifts = [];

        // normalise firebase docs into memory for CalendarEntityType.SHIFT
        shifts = snapshot.docs.map((doc) => {
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

        // add recurring events into memory
        shifts = recurringCalendarExpand(shifts, {
            rangeStart: new Date(),
            rangeEnd: addWeeks(new Date(), 52),
            maxOccurrences: 52,
        });

        setCalendarShifts(shifts);
    }, () => {
        setCalendarShifts([]);
    });
};


export const firestoreFetchAvailabilities = (setCalendarAvailabilities) => {
    const availabilitiesRef = collection(db, 'tutorAvailabilities');

    return onSnapshot(availabilitiesRef, (snapshot) => {
        let availabilities = [];

        // normalise firebase docs into memory for CalendarEntityType.AVAILABILITY
        availabilities = snapshot.docs.map((doc) => {
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
    }, () => {
        setCalendarAvailabilities([]);
    });
};


export const firestoreFetchStudentRequests = (setCalendarStudentRequests) => {
    const requestsRef = collection(db, 'studentEventRequests');

    return onSnapshot(requestsRef, (snapshot) => {
        let requests = [];

        // normalise firebase docs into memory for CalendarEntityType.STUDENT_REQUEST
        requests = snapshot.docs.map((doc) => {
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
    }, () => {
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
