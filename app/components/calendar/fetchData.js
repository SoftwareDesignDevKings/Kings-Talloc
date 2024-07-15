import { db } from '../../firebase';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';

export const fetchEvents = async (userRole, userEmail, setEvents, setAllEvents) => {
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
      const studentClasses = classQuerySnapshot.docs
        .map(doc => doc.data())
        .filter(cls => cls.students.some(student => student.email === userEmail))
        .map(cls => cls.name);

      filteredEvents = eventsFromDb.filter(event => 
        event.students.some(student => student.value === userEmail) ||
        event.classes.some(cls => studentClasses.includes(cls.label))
      );
    }

    setEvents(filteredEvents);
  });

  return () => unsubscribe();
};

export const fetchAvailabilities = async (setAvailabilities) => {
  const q = query(collection(db, 'availabilities'));
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const availabilitiesFromDb = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      start: doc.data().start.toDate(),
      end: doc.data().end.toDate(),
    }));

    setAvailabilities(availabilitiesFromDb);
  });

  return () => unsubscribe();
};

export const fetchTutors = async (setTutors) => {
  const querySnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'tutor')));
  const tutorsList = querySnapshot.docs.map(doc => ({
    value: doc.data().email,
    label: doc.data().name || doc.data().email,
  }));
  setTutors(tutorsList);
};
