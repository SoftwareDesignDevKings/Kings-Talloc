"use client";

import React, { useState, useEffect } from 'react';
import { FiCalendar, FiUsers, FiClock } from '@/components/icons';
import { format } from 'date-fns';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firestore/clientFirestore.js';

const DashboardOverview = ({ userRole, userEmail }) => {
  const [stats, setStats] = useState({
    upcomingEvents: 0,
    unapprovedStudentRequests: 0,
    completedEvents: 0
  });
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [userEmail, userRole]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const eventsRef = collection(db, 'events');
      const now = new Date();

      // Fetch events based on role
      let eventsQuery;
      if (userRole === 'teacher') {
        eventsQuery = query(eventsRef, orderBy('start', 'asc'), limit(100));
      } else if (userRole === 'tutor') {
        eventsQuery = query(
          eventsRef,
          where('staff', 'array-contains', { value: userEmail, label: userEmail }),
          orderBy('start', 'asc'),
          limit(100)
        );
      } else {
        eventsQuery = query(
          eventsRef,
          where('students', 'array-contains', { value: userEmail, label: userEmail }),
          orderBy('start', 'asc'),
          limit(100)
        );
      }

      const querySnapshot = await getDocs(eventsQuery);
      const events = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        start: doc.data().start,
        end: doc.data().end
      }));

      // Calculate stats
      const upcomingEventsData = events
        .filter(event => new Date(event.start) > now)
        .slice(0, 5);

      const unapprovedStudentRequests = events.filter(event =>
        event.createdByStudent === true &&
        event.approvalStatus === 'pending'
      ).length;

      const completedEventsCount = events.filter(event =>
        event.workStatus === 'completed' && new Date(event.end) < now
      ).length;

      setStats({
        upcomingEvents: upcomingEventsData.length,
        unapprovedStudentRequests,
        completedEvents: completedEventsCount
      });

      setUpcomingEvents(upcomingEventsData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid p-0">
      {/* Stats Cards */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-md-4">
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

        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-warning bg-opacity-10 rounded p-3">
                    <FiClock className="text-warning" size={24} />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h6 className="text-muted mb-1 small">Unapproved Requests</h6>
                  <h3 className="mb-0 fw-bold">{stats.unapprovedStudentRequests}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-success bg-opacity-10 rounded p-3">
                    <FiUsers className="text-success" size={24} />
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h6 className="text-muted mb-1 small">Completed Events</h6>
                  <h3 className="mb-0 fw-bold">{stats.completedEvents}</h3>
                </div>
              </div>
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
