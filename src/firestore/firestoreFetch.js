import { db } from '@/firestore/firestoreClient';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { recurringExpand } from '@/utils/calendarRecurringEvents';
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
        shifts = recurringExpand(shifts, {
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
                name: data.email,
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

// /**
//  * Fetch shifts in real-time and update state based on user role for CalendarWrapper
//  * @param {String} userRole
//  * @param {String} userEmail
//  * @param {Function} setEvents
//  * @param {Function} setAllEvents
//  * @param {Function} setStudents
//  * @returns
//  */
// export const firestoreFetchShifts = async (
//     userRole,
//     userEmail,
//     setEvents,
//     setAllEvents,
//     setStudents,
//     setLoading,
// ) => {
//     const q = query(collection(db, 'shifts'));
//     let isFirstLoad = true;
//     let studentClasses = []; // Cache student classes

//     // Fetch students once on mount
//     const fetchStudentsOnce = async () => {
//         try {
//             const studentSnapshot = await getDocs(collection(db, 'students'));
//             const students = studentSnapshot.docs.map((doc) => ({
//                 value: doc.data().email,
//                 label: doc.data().name || doc.data().email,
//             }));
//             setStudents(students);
//         } catch (error) {
//             console.error('Error fetching students:', error);
//             setStudents([]);
//         }
//     };

//     // Fetch student classes once for student role
//     if (userRole === 'student') {
//         try {
//             const classQuerySnapshot = await getDocs(collection(db, 'classes'));
//             studentClasses = classQuerySnapshot.docs
//                 .map((doc) => doc.data())
//                 .filter(
//                     (cls) =>
//                         cls.students &&
//                         Array.isArray(cls.students) &&
//                         cls.students.some((student) => student.email === userEmail),
//                 )
//                 .map((cls) => cls.name);
//         } catch (error) {
//             console.error('Error fetching student classes:', error);
//         }
//     }

//     const unsubscribe = onSnapshot(
//         q,
//         async (querySnapshot) => {
//             const eventsFromDb = querySnapshot.docs.map((doc) => ({
//                 ...doc.data(),
//                 id: doc.id,
//                 start: doc.data().start.toDate(),
//                 end: doc.data().end.toDate(),
//                 ...(doc.data().until && { until: doc.data().until.toDate() }),
//                 entityType: CalendarEntityType.SHIFTS,
//             }));

//             // Expand recurring events in memory (1 year range)
//             const expandedEvents = recurringExpand(eventsFromDb, {
//                 rangeStart: new Date(),
//                 rangeEnd: addWeeks(new Date(), 52),
//                 maxOccurrences: 52,
//             });

//             // Fetch students on first load
//             if (isFirstLoad) {
//                 await fetchStudentsOnce();
//                 isFirstLoad = false;
//             }

//             // Store all expanded events (including future recurring instances) in state
//             setAllEvents(expandedEvents);

//             let filteredEvents = [];
//             if (userRole === 'teacher') {
//                 filteredEvents = expandedEvents;
//             } else if (userRole === 'tutor') {
//                 filteredEvents = expandedEvents.filter((event) =>
//                     event.staff.some((staff) => staff.value === userEmail),
//                 );
//             } else if (userRole === 'student') {
//                 filteredEvents = expandedEvents.filter(
//                     (event) =>
//                         event.students.some((student) => student.value === userEmail) ||
//                         event.classes.some((cls) => studentClasses.includes(cls.label)),
//                 );
//             }

//             setEvents(filteredEvents);

//             // Mark as loaded after first snapshot
//             if (setLoading) {
//                 setLoading(false);
//             }
//         },
//         (error) => {
//             console.error('Error fetching events:', error);
//             setEvents([]);
//             setAllEvents([]);
//             setStudents([]);
//             if (setLoading) setLoading(false);
//         },
//     );

//     return () => {
//         unsubscribe();
//     };
// };

// /**
//  * Fetch tutor availabilities in real-time and update state
//  * @param {Function} setAvailabilities
//  * @returns
//  */
// export const firestoreFetchAvailabilities = async (setAvailabilities) => {
//     const q = query(collection(db, 'tutorAvailabilities'));

//     // real-time listener
//     const unsubscribe = onSnapshot(
//         q,
//         (querySnapshot) => {
//             const availabilitiesFromDb = querySnapshot.docs.map((doc) => ({
//                 ...doc.data(),
//                 id: doc.id,
//                 start: doc.data().start.toDate(),
//                 end: doc.data().end.toDate(),
//                 entityType: CalendarEntityType.AVAILABILITY,
//             }));

//             setAvailabilities(availabilitiesFromDb);
//         },
//         (error) => {
//             console.error('Error fetching availabilities:', error);
//             setAvailabilities([]);
//         },
//     );

//     // cleanup listener on unmount
//     return () => unsubscribe();
// };

// /**
//  * Fetch student event requests in real-time and update state
//  * @param {Function} setStudentRequests
//  * @returns
//  */
// export const firestoreFetchStudentRequests = async (setStudentRequests) => {
//     const q = query(collection(db, 'studentEventRequests'));
//     const unsubscribe = onSnapshot(
//         q,
//         (querySnapshot) => {
//             const requestsFromDb = querySnapshot.docs.map((doc) => ({
//                 ...doc.data(),
//                 id: doc.id,
//                 start: doc.data().start.toDate(),
//                 end: doc.data().end.toDate(),
//                 isStudentRequest: true,
//                 entityType: CalendarEntityType.STUDENT_REQUEST,
//             }));

//             setStudentRequests(requestsFromDb);
//         },
//         (error) => {
//             setStudentRequests([]);
//         },
//     );

//     // cleanup listener on unmount
//     return () => unsubscribe();
// };

// /**
//  * Fetch tutors for dropdowns
//  * @param {Function} setTutors
//  */
// export const firestoreFetchTutors = async (setTutors) => {
//     const usersCollection = collection(db, 'users');
//     const tutorsQuery = query(usersCollection, where('role', '==', 'tutor'));
//     const tutorsSnapshot = await getDocs(tutorsQuery);

//     // fallbacck to email if no name
//     const tutorsList = tutorsSnapshot.docs.map((doc) => ({
//         email: doc.data().email,
//         name: doc.data().name || doc.data().email,
//     }));

//     setTutors(tutorsList);
// };

// /**
//  * Fetch subjects with their associated tutors
//  * @param {Function} setSubjects
//  */
// export const firestoreFetchSubjectsWithTutors = async (setSubjects) => {
//     const subjectsCollection = collection(db, 'subjects');
//     const subjectsSnapshot = await getDocs(subjectsCollection);

//     // fallback to empty array if no tutors
//     const subjectsList = subjectsSnapshot.docs.map((doc) => ({
//         id: doc.id,
//         name: doc.data().name,
//         tutors: doc.data().tutors || [],
//     }));

//     setSubjects(subjectsList);
// };
