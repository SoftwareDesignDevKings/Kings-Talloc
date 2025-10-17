"use client";

import React, { useState, useEffect } from 'react';
import { FiCalendar, FiUsers, FiClock, FiCheckCircle, FiAlertCircle, FiTrendingUp, FiBookOpen, FiActivity, FiChevronDown } from '@/components/icons';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { collection, query, where, getDocs, orderBy, limit, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/firestore/clientFirestore.js';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

const DashboardOverview = ({ userRole, userEmail }) => {
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);

  // Common stats
  const [upcomingEventsCount, setUpcomingEventsCount] = useState(0);
  const [unapprovedStudentRequests, setUnapprovedStudentRequests] = useState(0);
  const [completedEvents, setCompletedEvents] = useState(0);

  // Teacher-specific stats
  const [activeTutors, setActiveTutors] = useState(0);
  const [totalTutors, setTotalTutors] = useState(0);
  const [weeklyUtilization, setWeeklyUtilization] = useState(0);
  const [topSubjects, setTopSubjects] = useState([]);

  // Tutor-specific stats
  const [weeklyHours, setWeeklyHours] = useState({ tutoring: 0, coaching: 0 });
  const [needsCompletion, setNeedsCompletion] = useState(0);
  const [needsConfirmation, setNeedsConfirmation] = useState(0);
  const [uniqueStudents, setUniqueStudents] = useState(0);

  // Student-specific stats
  const [pendingRequests, setPendingRequests] = useState(0);
  const [approvedRequests, setApprovedRequests] = useState(0);
  const [rejectedRequests, setRejectedRequests] = useState(0);
  const [availableTutors, setAvailableTutors] = useState(0);

  // Dropdown state for pending approvals
  const [showApprovalsDropdown, setShowApprovalsDropdown] = useState(false);
  const [pendingRequestsData, setPendingRequestsData] = useState([]);

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
        // Query all events and filter client-side for tutors
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
      let events = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        start: doc.data().start.toDate ? doc.data().start.toDate() : new Date(doc.data().start),
        end: doc.data().end.toDate ? doc.data().end.toDate() : new Date(doc.data().end)
      }));

      // Filter events for tutors client-side
      if (userRole === 'tutor') {
        events = events.filter(event =>
          event.staff?.some(staff => {
            const staffEmail = typeof staff === 'string' ? staff : (staff.value || staff.label);
            return staffEmail === userEmail;
          })
        );
      }

      // Calculate common stats
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);

      const todayEventsData = events
        .filter(event => event.start >= startOfToday && event.start <= endOfToday)
        .sort((a, b) => a.start - b.start);

      const upcomingEventsData = events
        .filter(event => event.start > now)
        .slice(0, 5);

      const unapprovedStudentRequests = events.filter(event =>
        event.createdByStudent === true &&
        event.approvalStatus === 'pending'
      ).length;

      const studentEventReqRef = collection(db, 'studentEventRequests');
      const studentEventSnapshot = await getDocs(studentEventReqRef);

      const unapprovedStudentRequestsArr = studentEventSnapshot.docs
        .filter(doc => doc.data().approvalStatus === "pending")
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          start: doc.data().start?.toDate ? doc.data().start.toDate() : new Date(doc.data().start),
          end: doc.data().end?.toDate ? doc.data().end.toDate() : new Date(doc.data().end)
        }));

      setPendingRequestsData(unapprovedStudentRequestsArr);

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

      // Set common stats
      setUpcomingEventsCount(upcomingEventsData.length);
      setUnapprovedStudentRequests(unapprovedStudentRequestsArr.length);
      setCompletedEvents(completedEventsCount);
      setUpcomingEvents(upcomingEventsData);
      setTodayEvents(todayEventsData);

      // Set role-specific stats
      if (userRole === 'teacher') {
        setActiveTutors(roleSpecificStats.activeTutors);
        setTotalTutors(roleSpecificStats.totalTutors);
        setWeeklyUtilization(roleSpecificStats.weeklyUtilization);
        setTopSubjects(roleSpecificStats.topSubjects);
      } else if (userRole === 'tutor') {
        setWeeklyHours(roleSpecificStats.weeklyHours);
        setNeedsCompletion(roleSpecificStats.needsCompletion);
        setNeedsConfirmation(roleSpecificStats.needsConfirmation);
        setUniqueStudents(roleSpecificStats.uniqueStudents);
      } else if (userRole === 'student') {
        setPendingRequests(roleSpecificStats.pendingRequests);
        setApprovedRequests(roleSpecificStats.approvedRequests);
        setRejectedRequests(roleSpecificStats.rejectedRequests);
        setAvailableTutors(roleSpecificStats.availableTutors);
      }
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

    // Count events needing completion (events within this week without completed status)
    let needsCompletionCount = 0;
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (event.end >= weekStart && event.end <= weekEnd && event.workStatus !== 'completed') {
        needsCompletionCount++;
      }
    }

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
      needsCompletion: needsCompletionCount,
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
        event.approvalStatus === 'denied'
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

  const handleApproveRequest = async (requestId) => {
    try {
      const requestRef = doc(db, 'studentEventRequests', requestId);
      await updateDoc(requestRef, {
        approvalStatus: 'approved',
        approvedAt: new Date()
      });

      setPendingRequestsData(prev => prev.filter(req => req.id !== requestId));
      setUnapprovedStudentRequests(prev => prev - 1);
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      const requestRef = doc(db, 'studentEventRequests', requestId);
      await updateDoc(requestRef, {
        approvalStatus: 'rejected',
        rejectedAt: new Date()
      });

      setPendingRequestsData(prev => prev.filter(req => req.id !== requestId));
      setUnapprovedStudentRequests(prev => prev - 1);
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const handleDeleteRequest = async (requestId) => {
    try {
      const requestRef = doc(db, 'studentEventRequests', requestId);
      await deleteDoc(requestRef);

      setPendingRequestsData(prev => prev.filter(req => req.id !== requestId));
      setUnapprovedStudentRequests(prev => prev - 1);
    } catch (error) {
      console.error('Error deleting request:', error);
    }
  };

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
                    <h3 className="mb-0 fw-bold">{upcomingEventsCount}</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4 col-lg-3">
            <div className="card border-0 shadow-sm position-relative">
              <div
                className="card-body"
                onClick={() => setShowApprovalsDropdown(!showApprovalsDropdown)}
              >
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0">
                    <div className="bg-warning bg-opacity-10 rounded p-3">
                      <FiClock className="text-warning" size={24} />
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h6 className="text-muted mb-1 small">Pending Approvals</h6>
                    <h3 className="mb-0 fw-bold">{unapprovedStudentRequests}</h3>
                  </div>
                  <FiChevronDown className="text-muted ms-2" />
                </div>
              </div>

              {showApprovalsDropdown && (
                <div className="position-absolute top-100 start-0 w-100 mt-2 bg-white border rounded shadow-lg" style={{ zIndex: 1050, maxHeight: '400px', overflowY: 'auto' }}>
                  {pendingRequestsData.length === 0 ? (
                    <div className="p-4 text-center text-muted">
                      <div className="small">No pending approvals</div>
                    </div>
                  ) : (
                    <div className="list-group list-group-flush">
                      {pendingRequestsData.map((request) => (
                        <div key={request.id} className="list-group-item">
                          <div className="d-flex flex-column gap-2">
                            <div>
                              <div className="fw-semibold">{request.title || 'Untitled Request'}</div>
                              <div className="small text-muted mt-1">
                                {request.students && request.students.length > 0 && (
                                  <div>
                                    <strong>Student:</strong> {request.students.map(s => s.label || s.value).join(', ')}
                                  </div>
                                )}
                                {request.staff && request.staff.length > 0 && (
                                  <div>
                                    <strong>Tutor:</strong> {request.staff.map(t => t.label || t.value).join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="small text-muted">
                              <div>
                                {format(request.start, 'MMM d, yyyy h:mm a')} - {format(request.end, 'h:mm a')}
                              </div>
                              {request.subject && (
                                <div>
                                  Subject: {typeof request.subject === 'string' ? request.subject : request.subject.label}
                                </div>
                              )}
                            </div>

                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-sm btn-success"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApproveRequest(request.id);
                                }}
                              >
                                Approve
                              </button>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRejectRequest(request.id);
                                }}
                              >
                                Reject
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRequest(request.id);
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
                    <h3 className="mb-0 fw-bold">{activeTutors}/{totalTutors}</h3>
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
                    <h3 className="mb-0 fw-bold">{weeklyUtilization}%</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {topSubjects.length > 0 && (
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <h6 className="text-muted mb-3 small d-flex align-items-center">
                    <FiBookOpen className="me-2" /> Top Subjects This Week
                  </h6>
                  <div className="d-flex gap-3 flex-wrap">
                    {topSubjects.map((subject, idx) => (
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
                    <h3 className="mb-0 fw-bold">{upcomingEventsCount}</h3>
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
                      {(weeklyHours.tutoring + weeklyHours.coaching).toFixed(1)}
                    </h3>
                    <small className="text-muted">
                      T: {weeklyHours.tutoring} | C: {weeklyHours.coaching}
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
                    <h3 className="mb-0 fw-bold">{needsCompletion}</h3>
                    <small className="text-muted">
                      {format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'dd/MM/yy')} - {format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'dd/MM/yy')}
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
                    <div className="bg-info bg-opacity-10 rounded p-3">
                      <FiUsers className="text-info" size={24} />
                    </div>
                  </div>
                  <div className="flex-grow-1 ms-3">
                    <h6 className="text-muted mb-1 small">Students Helped</h6>
                    <h3 className="mb-0 fw-bold">{uniqueStudents}</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {needsConfirmation > 0 && (
            <div className="col-12">
              <div className="alert alert-warning mb-0 d-flex align-items-center">
                <FiAlertCircle className="me-2" size={20} />
                <span>You have {needsConfirmation} event(s) requiring your confirmation</span>
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
                    <h3 className="mb-0 fw-bold">{upcomingEventsCount}</h3>
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
                    <h3 className="mb-0 fw-bold">{pendingRequests}</h3>
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
                    <h3 className="mb-0 fw-bold">{approvedRequests}</h3>
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
                    <h3 className="mb-0 fw-bold">{availableTutors}</h3>
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

      {/* Today's Events */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <h5 className="mb-0 fw-semibold">Events for Today</h5>
            </div>
            <div className="card-body">
              {todayEvents.length === 0 ? (
                <div className="text-center py-5">
                  <FiCalendar className="text-muted mb-3" size={48} />
                  <p className="text-muted mb-0">No events scheduled for today</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {todayEvents.map((event, index) => (
                    <div key={event.id} className={`list-group-item border-0 px-0 ${index === 0 ? 'pt-0 pb-3' : 'py-3'}`}>
                      <div className="d-flex align-items-start">
                        <div className="flex-shrink-0 me-3">
                          <div className="bg-success bg-opacity-10 rounded p-3 text-center" style={{ minWidth: '70px' }}>
                            <div className="fw-semibold text-success">Today</div>
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
                              <>
                                {userRole === 'teacher' ? (
                                  event.staff.map((staff, idx) => (
                                    <span key={idx} className="badge bg-secondary">
                                      {staff.label || staff.value}
                                    </span>
                                  ))
                                ) : (
                                  <span className="badge bg-secondary">
                                    {event.staff.length} Staff
                                  </span>
                                )}
                              </>
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
                  {upcomingEvents.map((event, index) => (
                    <div key={event.id} className={`list-group-item border-0 px-0 ${index === 0 ? 'pt-0 pb-3' : 'py-3'}`}>
                      <div className="d-flex align-items-start">
                        <div className="flex-shrink-0 me-3">
                          <div className="bg-primary bg-opacity-10 rounded p-3 text-center" style={{ minWidth: '70px' }}>
                            <div className="fw-semibold text-primary">
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
                              <>
                                {userRole === 'teacher' ? (
                                  event.staff.map((staff, idx) => (
                                    <span key={idx} className="badge bg-secondary">
                                      {staff.label || staff.value}
                                    </span>
                                  ))
                                ) : (
                                  <span className="badge bg-secondary">
                                    {event.staff.length} Staff
                                  </span>
                                )}
                              </>
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
