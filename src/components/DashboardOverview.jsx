"use client";

import React, { useState, useEffect } from 'react';
import { FiCalendar, FiUsers, FiClock, FiCheckCircle, FiAlertCircle, FiTrendingUp, FiBookOpen, FiActivity } from '@/components/icons';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '@/firestore/clientFirestore.js';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

const DashboardOverview = ({ userRole, userEmail }) => {
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [stats, setStats] = useState({
    upcomingEvents: 0,
    unapprovedStudentRequests: 0,
    completedEvents: 0,
    // Teacher-specific
    activeTutors: 0,
    totalTutors: 0,
    weeklyUtilization: 0,
    topSubjects: [],
    // Tutor-specific
    weeklyHours: { tutoring: 0, coaching: 0 },
    needsCompletion: 0,
    needsConfirmation: 0,
    uniqueStudents: 0,
    // Student-specific
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    availableTutors: 0
  });
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const eventsRef = collection(db, 'events');
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      // Fetch events based on role
      let eventsQuery;
      if (userRole === 'teacher') {
        eventsQuery = query(eventsRef, orderBy('start', 'asc'), limit(200));
      } else if (userRole === 'tutor') {
        eventsQuery = query(
          eventsRef,
          where('staff', 'array-contains', { value: userEmail, label: userEmail }),
          orderBy('start', 'asc'),
          limit(200)
        );
      } else {
        eventsQuery = query(
          eventsRef,
          where('students', 'array-contains', { value: userEmail, label: userEmail }),
          orderBy('start', 'asc'),
          limit(200)
        );
      }

      const querySnapshot = await getDocs(eventsQuery);
      const events = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        start: doc.data().start.toDate ? doc.data().start.toDate() : new Date(doc.data().start),
        end: doc.data().end.toDate ? doc.data().end.toDate() : new Date(doc.data().end)
      }));

      // Calculate common stats
      const upcomingEventsData = events
        .filter(event => event.start > now)
        .slice(0, 5);

      const unapprovedStudentRequests = events.filter(event =>
        event.createdByStudent === true &&
        event.approvalStatus === 'pending'
      ).length;

      const completedEventsCount = events.filter(event =>
        event.workStatus === 'completed' && event.end < now
      ).length;

      let roleSpecificStats = {};

      // Role-specific calculations
      if (userRole === 'teacher') {
        roleSpecificStats = await calculateTeacherStats(events, weekStart, weekEnd);
      } else if (userRole === 'tutor') {
        roleSpecificStats = calculateTutorStats(events, now, weekStart, weekEnd, userEmail);
      } else if (userRole === 'student') {
        roleSpecificStats = await calculateStudentStats(events, userEmail);
      }

      setStats({
        upcomingEvents: upcomingEventsData.length,
        unapprovedStudentRequests,
        completedEvents: completedEventsCount,
        ...roleSpecificStats
      });

      setUpcomingEvents(upcomingEventsData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTeacherStats = async (events, weekStart, weekEnd) => {
    try {
      // Fetch all tutors
      const usersRef = collection(db, 'users');
      const tutorsQuery = query(usersRef, where('role', '==', 'tutor'));
      const tutorsSnapshot = await getDocs(tutorsQuery);
      const totalTutors = tutorsSnapshot.size;

      // Get active tutors (those with events this week)
      const weeklyEvents = events.filter(event =>
        isWithinInterval(event.start, { start: weekStart, end: weekEnd })
      );

      const activeTutorEmails = new Set();
      weeklyEvents.forEach(event => {
        event.staff?.forEach(staff => activeTutorEmails.add(staff.value));
      });

      // Calculate subject distribution
      const subjectCounts = {};
      weeklyEvents.forEach(event => {
        if (event.subject) {
          // Handle both string and object formats
          const subjectName = typeof event.subject === 'string'
            ? event.subject
            : (event.subject.label || event.subject.value || 'Unknown');
          subjectCounts[subjectName] = (subjectCounts[subjectName] || 0) + 1;
        }
      });

      const topSubjects = Object.entries(subjectCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));

      // Calculate utilization (events / available slots)
      const availabilitiesRef = collection(db, 'tutorAvailabilities');
      const availabilitiesSnapshot = await getDocs(availabilitiesRef);
      const weeklyAvailabilities = availabilitiesSnapshot.docs
        .map(doc => ({
          ...doc.data(),
          start: doc.data().start.toDate ? doc.data().start.toDate() : new Date(doc.data().start),
          end: doc.data().end.toDate ? doc.data().end.toDate() : new Date(doc.data().end)
        }))
        .filter(avail => isWithinInterval(avail.start, { start: weekStart, end: weekEnd }));

      const totalAvailableHours = weeklyAvailabilities.reduce((sum, avail) => {
        return sum + (avail.end - avail.start) / (1000 * 60 * 60);
      }, 0);

      const totalBookedHours = weeklyEvents.reduce((sum, event) => {
        return sum + (event.end - event.start) / (1000 * 60 * 60);
      }, 0);

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
    const weeklyEvents = events.filter(event =>
      isWithinInterval(event.start, { start: weekStart, end: weekEnd })
    );

    // Calculate hours by type
    let tutoringHours = 0;
    let coachingHours = 0;

    weeklyEvents.forEach(event => {
      if (event.workStatus === 'completed') {
        const hours = (event.end - event.start) / (1000 * 60 * 60);
        if (event.workType === 'coaching') {
          coachingHours += hours;
        } else {
          tutoringHours += hours;
        }
      }
    });

    // Count events needing completion (past events without workStatus)
    const needsCompletion = events.filter(event =>
      event.end < now && (!event.workStatus || event.workStatus === 'notCompleted')
    ).length;

    // Count events needing confirmation
    const needsConfirmation = events.filter(event =>
      event.confirmationRequired &&
      !event.tutorResponses?.some(resp => resp.email === userEmail && resp.response)
    ).length;

    // Count unique students
    const uniqueStudentEmails = new Set();
    events.forEach(event => {
      event.students?.forEach(student => uniqueStudentEmails.add(student.value));
    });

    return {
      weeklyHours: {
        tutoring: Math.round(tutoringHours * 10) / 10,
        coaching: Math.round(coachingHours * 10) / 10
      },
      needsCompletion,
      needsConfirmation,
      uniqueStudents: uniqueStudentEmails.size
    };
  };

  const calculateStudentStats = async (events, userEmail) => {
    try {
      // Count requests by approval status
      const pendingRequests = events.filter(event =>
        event.createdByStudent &&
        event.approvalStatus === 'pending'
      ).length;

      const approvedRequests = events.filter(event =>
        event.createdByStudent &&
        event.approvalStatus === 'approved'
      ).length;

      const rejectedRequests = events.filter(event =>
        event.createdByStudent &&
        event.approvalStatus === 'rejected'
      ).length;

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

  // Wait for Firebase Auth to be ready before fetching data
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

  // Fetch data only when Firebase is ready
  useEffect(() => {
    if (firebaseReady && userEmail) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, userRole, firebaseReady]);

  if (loading) {
    return <LoadingSpinner />;
  }

  const renderStatsCards = () => {
    if (userRole === 'teacher') {
      return (
        <>
          <div className="col-12 col-md-4 col-lg-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-primary bg-opacity-10 rounded p-3">
                      <FiCalendar className="text-primary" size={24} />
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h6 className="text-muted mb-1 small">Upcoming Events</h6>
                    <h3 className="mb-0 fw-bold">{stats.upcomingEvents}</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4 col-lg-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-warning bg-opacity-10 rounded p-3">
                      <FiClock className="text-warning" size={24} />
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h6 className="text-muted mb-1 small">Pending Approvals</h6>
                    <h3 className="mb-0 fw-bold">{stats.unapprovedStudentRequests}</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4 col-lg-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-info bg-opacity-10 rounded p-3">
                      <FiUsers className="text-info" size={24} />
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h6 className="text-muted mb-1 small">Active Tutors</h6>
                    <h3 className="mb-0 fw-bold">{stats.activeTutors}/{stats.totalTutors}</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4 col-lg-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-success bg-opacity-10 rounded p-3">
                      <FiTrendingUp className="text-success" size={24} />
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h6 className="text-muted mb-1 small">Weekly Utilization</h6>
                    <h3 className="mb-0 fw-bold">{stats.weeklyUtilization}%</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {stats.topSubjects.length > 0 && (
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <h6 className="text-muted mb-3 small d-flex align-items-center">
                    <FiBookOpen className="me-2" /> Top Subjects This Week
                  </h6>
                  <div className="d-flex gap-3 flex-wrap">
                    {stats.topSubjects.map((subject, idx) => (
                      <span key={idx} className="badge bg-primary px-3 py-2">
                        {subject.name} ({subject.count})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      );
    } else if (userRole === 'tutor') {
      return (
        <>
          <div className="col-12 col-md-4 col-lg-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-primary bg-opacity-10 rounded p-3">
                      <FiCalendar className="text-primary" size={24} />
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h6 className="text-muted mb-1 small">Upcoming Sessions</h6>
                    <h3 className="mb-0 fw-bold">{stats.upcomingEvents}</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4 col-lg-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-success bg-opacity-10 rounded p-3">
                      <FiActivity className="text-success" size={24} />
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h6 className="text-muted mb-1 small">Hours This Week</h6>
                    <h3 className="mb-0 fw-bold">
                      {(stats.weeklyHours.tutoring + stats.weeklyHours.coaching).toFixed(1)}
                    </h3>
                    <small className="text-muted">
                      T: {stats.weeklyHours.tutoring} | C: {stats.weeklyHours.coaching}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4 col-lg-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-warning bg-opacity-10 rounded p-3">
                      <FiAlertCircle className="text-warning" size={24} />
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h6 className="text-muted mb-1 small">Needs Completion</h6>
                    <h3 className="mb-0 fw-bold">{stats.needsCompletion}</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4 col-lg-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-info bg-opacity-10 rounded p-3">
                      <FiUsers className="text-info" size={24} />
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h6 className="text-muted mb-1 small">Students Helped</h6>
                    <h3 className="mb-0 fw-bold">{stats.uniqueStudents}</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {stats.needsConfirmation > 0 && (
            <div className="col-12">
              <div className="alert alert-warning mb-0 d-flex align-items-center">
                <FiAlertCircle className="me-2" size={20} />
                <span>You have {stats.needsConfirmation} event(s) requiring your confirmation</span>
              </div>
            </div>
          )}
        </>
      );
    } else {
      // Student view
      return (
        <>
          <div className="col-12 col-md-4 col-lg-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-primary bg-opacity-10 rounded p-3">
                      <FiCalendar className="text-primary" size={24} />
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h6 className="text-muted mb-1 small">Upcoming Sessions</h6>
                    <h3 className="mb-0 fw-bold">{stats.upcomingEvents}</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4 col-lg-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-warning bg-opacity-10 rounded p-3">
                      <FiClock className="text-warning" size={24} />
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h6 className="text-muted mb-1 small">Pending Requests</h6>
                    <h3 className="mb-0 fw-bold">{stats.pendingRequests}</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4 col-lg-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-success bg-opacity-10 rounded p-3">
                      <FiCheckCircle className="text-success" size={24} />
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h6 className="text-muted mb-1 small">Approved Requests</h6>
                    <h3 className="mb-0 fw-bold">{stats.approvedRequests}</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4 col-lg-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-info bg-opacity-10 rounded p-3">
                      <FiUsers className="text-info" size={24} />
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h6 className="text-muted mb-1 small">Available Tutors</h6>
                    <h3 className="mb-0 fw-bold">{stats.availableTutors}</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }
  };

  return (
    <div className="container-fluid p-0">
      {/* Stats Cards */}
      <div className="row g-4 mb-4">
        {renderStatsCards()}
      </div>

      {/* Upcoming Events List */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <h5 className="mb-0 fw-semibold">Upcoming Events</h5>
            </div>
            <div className="card-body">
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-5">
                  <FiCalendar className="text-muted mb-3" size={48} />
                  <p className="text-muted mb-0">No upcoming events scheduled</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="list-group-item border-0 px-0 py-3">
                      <div className="d-flex align-items-start">
                        <div className="flex-shrink-0 me-3">
                          <div className="bg-primary bg-opacity-10 rounded p-2 text-center" style={{ minWidth: '70px' }}>
                            <div className="small text-primary fw-semibold">
                              {format(new Date(event.start), 'MMM d')}
                            </div>
                            <div className="small text-muted">
                              {format(new Date(event.start), 'h:mm a')}
                            </div>
                          </div>
                        </div>
                        <div className="flex-grow-1">
                          <h6 className="mb-1 fw-semibold">{event.title}</h6>
                          {event.description && (
                            <p className="mb-2 text-muted small">{event.description}</p>
                          )}
                          <div className="d-flex flex-wrap gap-2">
                            {event.staff && event.staff.length > 0 && (
                              <span className="badge bg-secondary">
                                {event.staff.length} Staff
                              </span>
                            )}
                            {event.students && event.students.length > 0 && (
                              <span className="badge bg-primary">
                                {event.students.length} Students
                              </span>
                            )}
                            {event.createdByStudent && event.approvalStatus === 'pending' && (
                              <span className="badge bg-warning text-dark">Pending Approval</span>
                            )}
                            {event.createdByStudent && event.approvalStatus === 'approved' && (
                              <span className="badge bg-success">Approved</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
