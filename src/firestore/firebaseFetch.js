import { db } from '@/firestore/clientFirestore';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { expandRecurringEvents } from '@/utils/recurringEvents';
import { persistRecurringInstances } from './firebaseOperations';
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
  let persistCheckInterval = null;

  const unsubscribe = onSnapshot(q, async (querySnapshot) => {
    const eventsFromDb = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      start: doc.data().start.toDate(),
      end: doc.data().end.toDate(),
    }));

    // Get existing event IDs to avoid duplicates
    const existingEventIds = eventsFromDb.map(event => event.id);

    // Expand recurring events in memory (1 year range)
    // This keeps all future instances in state without persisting to Firestore
    const expandedEvents = expandRecurringEvents(eventsFromDb, {
      rangeStart: new Date(),
      rangeEnd: addWeeks(new Date(), 52),
      maxOccurrences: 52
    });

    // Function to persist started events
    const persistStartedEvents = async () => {
      try {
        const persistedCount = await persistRecurringInstances(expandedEvents, existingEventIds);
        if (persistedCount > 0) {
          console.log(`Persisted ${persistedCount} started recurring event instances to Firestore`);
        }
      } catch (error) {
        console.error('Error persisting recurring instances:', error);
      }
    };

    // Set up periodic check on first load (every 1 minute)
    if (isFirstLoad) {
      await persistStartedEvents(); // Check immediately on load
      persistCheckInterval = setInterval(persistStartedEvents, 60 * 1000); // Check every 1 minute
    }

    // Store all expanded events (including future recurring instances) in state
    setAllEvents(expandedEvents);

    let filteredEvents = [];
    if (userRole === 'teacher') {
        filteredEvents = expandedEvents;
    } else if (userRole === 'tutor') {
        filteredEvents = expandedEvents.filter(event => event.staff.some(staff => staff.value === userEmail));
    } else if (userRole === 'student') {
        const classQuerySnapshot = await getDocs(collection(db, 'classes'));

        // map and filter classes to those the student is in
        const studentClasses = classQuerySnapshot.docs
            .map(doc => doc.data())
            .filter(cls => cls.students && Array.isArray(cls.students) && cls.students.some(student => student.email === userEmail))
            .map(cls => cls.name);

        // filter events where the student is directly involved or their class is involved
        filteredEvents = expandedEvents.filter(event =>
            event.students.some(student => student.value === userEmail) ||
            event.classes.some(cls => studentClasses.includes(cls.label))
        );
    }

    setEvents(filteredEvents);

    // Fetch all students for filtering
    const studentSnapshot = await getDocs(collection(db, 'students'));
    const students = studentSnapshot.docs.map(doc => ({
        value: doc.data().email,
        label: doc.data().name || doc.data().email,
    }));

    setStudents(students);

    // Mark as loaded after first snapshot
    if (isFirstLoad && setLoading) {
      setLoading(false);
      isFirstLoad = false;
    }
  }, (error) => {
    console.error("Error fetching events:", error);
    // Set empty arrays on error to prevent app crash
    setEvents([]);
    setAllEvents([]);
    setStudents([]);
    if (setLoading) setLoading(false);
  });

  return () => {
    unsubscribe();
    if (persistCheckInterval) {
      clearInterval(persistCheckInterval);
    }
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
