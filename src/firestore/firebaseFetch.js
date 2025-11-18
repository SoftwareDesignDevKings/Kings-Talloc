import { db } from '@/firestore/clientFirestore';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { expandRecurringEvents } from '@/utils/recurringEvents';
import { addWeeks } from 'date-fns';

/**
 * Fetch events in real-time and update state based on user role for CalendarWrapper
 * @param {String} userRole 
 * @param {String} userEmail 
 * @param {Function} setEvents 
 * @param {Function} setAllEvents 
 * @param {Function} setStudents 
 * @returns 
 */
export const fetchEvents = async (userRole, userEmail, setEvents, setAllEvents, setStudents, setLoading) => {
  const q = query(collection(db, 'events'));
  let isFirstLoad = true;
  let studentClasses = []; // Cache student classes

  // Fetch students once on mount
  const fetchStudentsOnce = async () => {
    try {
      const studentSnapshot = await getDocs(collection(db, 'students'));
      const students = studentSnapshot.docs.map(doc => ({
        value: doc.data().email,
        label: doc.data().name || doc.data().email,
      }));
      setStudents(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      setStudents([]);
    }
  };

  // Fetch student classes once for student role
  if (userRole === 'student') {
    try {
      const classQuerySnapshot = await getDocs(collection(db, 'classes'));
      studentClasses = classQuerySnapshot.docs
        .map(doc => doc.data())
        .filter(cls => cls.students && Array.isArray(cls.students) && cls.students.some(student => student.email === userEmail))
        .map(cls => cls.name);
    } catch (error) {
      console.error("Error fetching student classes:", error);
    }
  }

  const unsubscribe = onSnapshot(q, async (querySnapshot) => {
    const eventsFromDb = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      start: doc.data().start.toDate(),
      end: doc.data().end.toDate(),
      ...(doc.data().until && { until: doc.data().until.toDate() }),
    }));

    // Expand recurring events in memory (1 year range)
    const expandedEvents = expandRecurringEvents(eventsFromDb, {
      rangeStart: new Date(),
      rangeEnd: addWeeks(new Date(), 52),
      maxOccurrences: 52
    });

    // Fetch students on first load
    if (isFirstLoad) {
      await fetchStudentsOnce();
      isFirstLoad = false;
    }

    // Store all expanded events (including future recurring instances) in state
    setAllEvents(expandedEvents);

    let filteredEvents = [];
    if (userRole === 'teacher') {
      filteredEvents = expandedEvents;
    } else if (userRole === 'tutor') {
      filteredEvents = expandedEvents.filter(event =>
        event.staff.some(staff => staff.value === userEmail)
      );
    } else if (userRole === 'student') {
      filteredEvents = expandedEvents.filter(event =>
        event.students.some(student => student.value === userEmail) ||
        event.classes.some(cls => studentClasses.includes(cls.label))
      );
    }

    setEvents(filteredEvents);

    // Mark as loaded after first snapshot
    if (setLoading) {
      setLoading(false);
    }
  }, (error) => {
    console.error("Error fetching events:", error);
    setEvents([]);
    setAllEvents([]);
    setStudents([]);
    if (setLoading) setLoading(false);
  });

  return () => {
    unsubscribe();
  };
};

/**
 * Fetch tutor availabilities in real-time and update state
 * @param {Function} setAvailabilities 
 * @returns 
 */
export const fetchAvailabilities = async (setAvailabilities) => {
  const q = query(collection(db, 'tutorAvailabilities'));

  // real-time listener
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const availabilitiesFromDb = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      start: doc.data().start.toDate(),
      end: doc.data().end.toDate(),
    }));

    setAvailabilities(availabilitiesFromDb);
  }, (error) => {
    console.error("Error fetching availabilities:", error);
    setAvailabilities([]);
  });

  // cleanup listener on unmount
  return () => unsubscribe();
};

/**
 * Fetch student event requests in real-time and update state
 * @param {Function} setStudentRequests 
 * @returns 
 */
export const fetchStudentRequests = async (setStudentRequests) => {
  const q = query(collection(db, 'studentEventRequests'));
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const requestsFromDb = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      start: doc.data().start.toDate(),
      end: doc.data().end.toDate(),
      isStudentRequest: true,
    }));

    console.log(`[Firestore Listener] Student requests updated: ${requestsFromDb.length} requests`);
    setStudentRequests(requestsFromDb);
  }, (error) => {
    console.error("Error fetching student requests:", error);
    setStudentRequests([]);
  });

  // cleanup listener on unmount
  return () => unsubscribe();
};

/**
 * Fetch tutors for dropdowns
 * @param {Function} setTutors 
 */
export const fetchTutors = async (setTutors) => {
  const usersCollection = collection(db, 'users');
  const tutorsQuery = query(usersCollection, where("role", "==", "tutor"));
  const tutorsSnapshot = await getDocs(tutorsQuery);

  // fallbacck to email if no name
  const tutorsList = tutorsSnapshot.docs.map(doc => ({
    email: doc.data().email,
    name: doc.data().name || doc.data().email,
  }));
  
  setTutors(tutorsList);
};

/**
 * Fetch subjects with their associated tutors
 * @param {Function} setSubjects 
 */
export const fetchSubjectsWithTutors = async (setSubjects) => {
    const subjectsCollection = collection(db, 'subjects');
    const subjectsSnapshot = await getDocs(subjectsCollection);

    // fallback to empty array if no tutors
    const subjectsList = subjectsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        tutors: doc.data().tutors || []
    }));

    setSubjects(subjectsList);
};
