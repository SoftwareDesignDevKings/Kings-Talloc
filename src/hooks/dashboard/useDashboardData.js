import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '@/firestore/clientFirestore.js';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

const calculateTeacherStats = async (events, weekStart, weekEnd) => {
  try {
    const usersRef = collection(db, 'users');
    const tutorsQuery = query(usersRef, where('role', '==', 'tutor'));
    const tutorsSnapshot = await getDocs(tutorsQuery);
    const totalTutors = tutorsSnapshot.size;

    // Get active tutors (those with events this week)
    const weeklyEvents = [];
    for (const event of events) {
      if (isWithinInterval(event.start, { start: weekStart, end: weekEnd })) {
        weeklyEvents.push(event);
      }
    }

    const activeTutorEmails = new Set();
    for (const event of weeklyEvents) {
      if (event.staff) {
        for (const staff of event.staff) {
          activeTutorEmails.add(staff.value);
        }
      }
    }

    // Calculate subject distribution
    const subjectCounts = {};
    for (const event of weeklyEvents) {
      if (event.subject) {
        const subjectName = typeof event.subject === 'string'
          ? event.subject
          : (event.subject.label || event.subject.value || 'Unknown');

        if (!subjectCounts[subjectName]) {
          subjectCounts[subjectName] = 0;
        }
        subjectCounts[subjectName]++;
      }
    }

    const subjectEntries = [];
    for (const name in subjectCounts) {
      subjectEntries.push({ name, count: subjectCounts[name] });
    }
    subjectEntries.sort((a, b) => b.count - a.count);
    const topSubjects = subjectEntries.slice(0, 3);

    // Calculate utilization (events / available slots)
    const availabilitiesRef = collection(db, 'tutorAvailabilities');
    const availabilitiesSnapshot = await getDocs(availabilitiesRef);

    const weeklyAvailabilities = [];
    for (const doc of availabilitiesSnapshot.docs) {
      const data = doc.data();
      const avail = {
        ...data,
        start: data.start.toDate ? data.start.toDate() : new Date(data.start),
        end: data.end.toDate ? data.end.toDate() : new Date(data.end)
      };

      if (isWithinInterval(avail.start, { start: weekStart, end: weekEnd })) {
        weeklyAvailabilities.push(avail);
      }
    }

    let totalAvailableHours = 0;
    for (const avail of weeklyAvailabilities) {
      totalAvailableHours += (avail.end - avail.start) / (1000 * 60 * 60);
    }

    let totalBookedHours = 0;
    for (const event of weeklyEvents) {
      totalBookedHours += (event.end - event.start) / (1000 * 60 * 60);
    }

    const weeklyUtilization = totalAvailableHours > 0
      ? Math.round((totalBookedHours / totalAvailableHours) * 100)
      : 0;

    return {
      activeTutors: activeTutorEmails.size,
      totalTutors,
      weeklyUtilization,
      topSubjects
    };
  } catch (error) {
    console.error('Error calculating teacher stats:', error);
    return {
      activeTutors: 0,
      totalTutors: 0,
      weeklyUtilization: 0,
      topSubjects: []
    };
  }
};

const calculateTutorStats = (events, now, weekStart, weekEnd, userEmail) => {
  const weeklyEvents = [];
  for (const event of events) {
    if (isWithinInterval(event.start, { start: weekStart, end: weekEnd })) {
      weeklyEvents.push(event);
    }
  }

  // Calculate hours by type
  let tutoringHours = 0;
  let coachingHours = 0;

  for (const event of weeklyEvents) {
    if (event.workStatus === 'completed') {
      const hours = (event.end - event.start) / (1000 * 60 * 60);
      if (event.workType === 'coaching') {
        coachingHours += hours;
      } else {
        tutoringHours += hours;
      }
    }
  }

  // Count events needing completion
  let needsCompletionCount = 0;
  for (const event of events) {
    if (event.end >= weekStart && event.end <= weekEnd && event.workStatus !== 'completed') {
      needsCompletionCount++;
    }
  }

  // Count events needing confirmation
  let needsConfirmation = 0;
  for (const event of events) {
    if (!event.confirmationRequired) continue;

    let hasResponse = false;
    if (event.tutorResponses) {
      for (const resp of event.tutorResponses) {
        if (resp.email === userEmail && resp.response) {
          hasResponse = true;
          break;
        }
      }
    }

    if (!hasResponse) {
      needsConfirmation++;
    }
  }

  // Count unique students
  const uniqueStudentEmails = new Set();
  for (const event of events) {
    if (event.students) {
      for (const student of event.students) {
        uniqueStudentEmails.add(student.value);
      }
    }
  }

  return {
    weeklyHours: {
      tutoring: Math.round(tutoringHours * 10) / 10,
      coaching: Math.round(coachingHours * 10) / 10
    },
    needsCompletion: needsCompletionCount,
    needsConfirmation,
    uniqueStudents: uniqueStudentEmails.size
  };
};

const calculateStudentStats = async (events, userEmail) => {
  try {
    // Count requests by approval status
    let pendingRequests = 0;
    let approvedRequests = 0;
    let rejectedRequests = 0;

    for (const event of events) {
      if (!event.createdByStudent) continue;

      if (event.approvalStatus === 'pending') {
        pendingRequests++;
      } else if (event.approvalStatus === 'approved') {
        approvedRequests++;
      } else if (event.approvalStatus === 'denied') {
        rejectedRequests++;
      }
    }

    // Get available tutors count
    const usersRef = collection(db, 'users');
    const tutorsQuery = query(usersRef, where('role', '==', 'tutor'));
    const tutorsSnapshot = await getDocs(tutorsQuery);
    const availableTutors = tutorsSnapshot.size;

    return {
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      availableTutors
    };
  } catch (error) {
    console.error('Error calculating student stats:', error);
    return {
      pendingRequests: 0,
      approvedRequests: 0,
      rejectedRequests: 0,
      availableTutors: 0
    };
  }
};

export const useDashboardData = (userRole, userEmail) => {
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    upcomingEvents: [],
    todayEvents: [],
    upcomingEventsCount: 0,
    unapprovedStudentRequests: 0,
    completedEvents: 0,
    pendingRequestsData: [],
    // Teacher stats
    activeTutors: 0,
    totalTutors: 0,
    weeklyUtilization: 0,
    topSubjects: [],
    // Tutor stats
    weeklyHours: { tutoring: 0, coaching: 0 },
    needsCompletion: 0,
    needsConfirmation: 0,
    uniqueStudents: 0,
    // Student stats
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    availableTutors: 0
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setFirebaseReady(true);
      } else {
        setFirebaseReady(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseReady || !userEmail) return;

    const fetchDashboardData = async () => {
      try {
        const eventsRef = collection(db, 'events');
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

        // Fetch events based on role
        let eventsQuery;
        if (userRole === 'teacher') {
          eventsQuery = query(eventsRef, orderBy('start', 'asc'), limit(200));
        } else if (userRole === 'tutor') {
          eventsQuery = query(eventsRef, orderBy('start', 'asc'), limit(200));
        } else {
          eventsQuery = query(
            eventsRef,
            where('students', 'array-contains', { value: userEmail, label: userEmail }),
            orderBy('start', 'asc'),
            limit(200)
          );
        }

        const querySnapshot = await getDocs(eventsQuery);
        let events = [];
        for (const doc of querySnapshot.docs) {
          const data = doc.data();
          events.push({
            id: doc.id,
            ...data,
            start: data.start.toDate ? data.start.toDate() : new Date(data.start),
            end: data.end.toDate ? data.end.toDate() : new Date(data.end)
          });
        }

        // Filter events for tutors client-side
        if (userRole === 'tutor') {
          const tutorEvents = [];
          for (const event of events) {
            if (!event.staff) continue;

            let isTutorEvent = false;
            for (const staff of event.staff) {
              const staffEmail = typeof staff === 'string' ? staff : (staff.value || staff.label);
              if (staffEmail === userEmail) {
                isTutorEvent = true;
                break;
              }
            }

            if (isTutorEvent) {
              tutorEvents.push(event);
            }
          }
          events = tutorEvents;
        }

        // Calculate common stats
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);

        const todayEventsData = [];
        for (const event of events) {
          if (event.start >= startOfToday && event.start <= endOfToday) {
            todayEventsData.push(event);
          }
        }
        todayEventsData.sort((a, b) => a.start - b.start);

        const upcomingEventsData = [];
        for (const event of events) {
          if (event.start > now) {
            upcomingEventsData.push(event);
          }
          if (upcomingEventsData.length === 5) break;
        }

        const studentEventReqRef = collection(db, 'studentEventRequests');
        const studentEventSnapshot = await getDocs(studentEventReqRef);

        const unapprovedStudentRequestsArr = [];
        for (const doc of studentEventSnapshot.docs) {
          const data = doc.data();
          if (data.approvalStatus === "pending") {
            unapprovedStudentRequestsArr.push({
              id: doc.id,
              ...data,
              start: data.start?.toDate ? data.start.toDate() : new Date(data.start),
              end: data.end?.toDate ? data.end.toDate() : new Date(data.end)
            });
          }
        }

        let completedEventsCount = 0;
        for (const event of events) {
          if (event.workStatus === 'completed' && event.end < now) {
            completedEventsCount++;
          }
        }

        let roleSpecificStats = {};

        // Role-specific calculations
        if (userRole === 'teacher') {
          roleSpecificStats = await calculateTeacherStats(events, weekStart, weekEnd);
        } else if (userRole === 'tutor') {
          roleSpecificStats = calculateTutorStats(events, now, weekStart, weekEnd, userEmail);
        } else if (userRole === 'student') {
          roleSpecificStats = await calculateStudentStats(events, userEmail);
        }

        setDashboardData({
          upcomingEvents: upcomingEventsData,
          todayEvents: todayEventsData,
          upcomingEventsCount: upcomingEventsData.length,
          unapprovedStudentRequests: unapprovedStudentRequestsArr.length,
          completedEvents: completedEventsCount,
          pendingRequestsData: unapprovedStudentRequestsArr,
          ...roleSpecificStats
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchDashboardData();
  }, [userEmail, userRole, firebaseReady]);

  return { dashboardData };
};
