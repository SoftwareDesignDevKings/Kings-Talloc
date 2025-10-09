import { db } from '@/firestore/clientFirestore';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';

/**
 * Fetch events in real-time and update state based on user role for CalendarWrapper
 * @param {String} userRole 
 * @param {String} userEmail 
 * @param {Function} setEvents 
 * @param {Function} setAllEvents 
 * @param {Function} setStudents 
 * @returns 
 */
export const fetchEvents = async (userRole, userEmail, setEvents, setAllEvents, setStudents) => {
  const q = query(collection(db, 'events'));
  const unsubscribe = onSnapshot(q, async (querySnapshot) => {
    const eventsFromDb = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      start: doc.data().start.toDate(),
      end: doc.data().end.toDate(),
    }));

    // Store all events in a separate state
    setAllEvents(eventsFromDb);

    let filteredEvents = [];
    if (userRole === 'teacher') {
        filteredEvents = eventsFromDb;
    } else if (userRole === 'tutor') {
        filteredEvents = eventsFromDb.filter(event => event.staff.some(staff => staff.value === userEmail));
    } else if (userRole === 'student') {
        const classQuerySnapshot = await getDocs(collection(db, 'classes'));

        // map and filter classes to those the student is in
        const studentClasses = classQuerySnapshot.docs
            .map(doc => doc.data())
            .filter(cls => cls.students.some(student => student.email === userEmail))
            .map(cls => cls.name);

        // filter events where the student is directly involved or their class is involved
        filteredEvents = eventsFromDb.filter(event =>
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
  }, (error) => {
    console.error("Error fetching events:", error);
    // Set empty arrays on error to prevent app crash
    setEvents([]);
    setAllEvents([]);
    setStudents([]);
  });

  return () => unsubscribe();
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
