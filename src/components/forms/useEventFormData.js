import { useState, useEffect } from 'react';
import { db } from '@/firestore/clientFirestore.js';
import { collection, getDocs, query, where } from 'firebase/firestore';

/**
 * Hook to fetch and manage event form data (staff, classes, students)
 * This is a real hook because it has side effects (data fetching)
 */
export const useEventFormData = (newEvent) => {
  const [staffOptions, setStaffOptions] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [studentOptions, setStudentOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStaff = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'tutor'));
      const querySnapshot = await getDocs(q);
      const staffList = await Promise.all(querySnapshot.docs.map(async docSnap => {
        const tutorData = docSnap.data();
        const availabilityQuery = query(
          collection(db, 'tutorAvailabilities'),
          where('tutor', '==', docSnap.id)
        );
        const availabilitySnapshot = await getDocs(availabilityQuery);
        let availabilityStatus = 'unavailable';

        if (!availabilitySnapshot.empty) {
          const available = availabilitySnapshot.docs.some(availabilityDoc => {
            const availabilityData = availabilityDoc.data();
            const availabilityStart = availabilityData.start.toDate();
            const availabilityEnd = availabilityData.end.toDate();
            const eventStart = new Date(newEvent.start);
            const eventEnd = new Date(newEvent.end);

            return eventStart >= availabilityStart && eventEnd <= availabilityEnd;
          });

          if (available) {
            availabilityStatus = availabilitySnapshot.docs[0].data().locationType || 'onsite';
          }
        }

        return {
          value: docSnap.id,
          label: tutorData.name || tutorData.email,
          status: availabilityStatus
        };
      }));

      setStaffOptions(staffList);
    };

    const fetchClasses = async () => {
      const querySnapshot = await getDocs(collection(db, 'classes'));
      const classList = querySnapshot.docs.map(docSnap => ({
        value: docSnap.id,
        label: docSnap.data().name,
      }));
      setClassOptions(classList);
    };

    const fetchStudents = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      const querySnapshot = await getDocs(q);
      const studentList = querySnapshot.docs.map(docSnap => ({
        value: docSnap.id,
        label: docSnap.data().name || docSnap.data().email,
      }));
      setStudentOptions(studentList);
    };

    const fetchAll = async () => {
      setIsLoading(true);
      await Promise.all([fetchStaff(), fetchClasses(), fetchStudents()]);
      setIsLoading(false);
    };

    fetchAll();
  }, [newEvent.start, newEvent.end]);

  return {
    staffOptions,
    classOptions,
    studentOptions,
    isLoading
  };
};
