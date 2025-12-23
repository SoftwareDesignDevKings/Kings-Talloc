'use client';

import React, { useState, useEffect, useCallback } from 'react';
import useAuthSession from '@/hooks/useAuthSession';
import { fetchDashboardFirestoreDataTeacher } from '@/firestore/firestoreDashboardTeacher';
import { fetchDashboardFirestoreDataTutor } from '@/firestore/firestoreDashboardTutor';
import { fetchDashboardFirestoreDataStudent } from '@/firestore/firestoreDashboardStudent';
import { auth } from '@/firestore/firestoreClient';
import StatsCards from '@/components/dashboard/StatsCards.jsx';
import EventsList from '@/components/dashboard/EventsList.jsx';
import PersonalCalendarModal from '@/components/modals/PersonalCalendarModal.jsx';

const DashboardOverview = () => {
    const { session, userRole } = useAuthSession();
    const [dashboardData, setDashboardData] = useState({
        upcomingEvents: [],
        todayEvents: [],
        upcomingEventsCount: 0,
        unapprovedStudentRequests: 0,
        completedEvents: 0,
        pendingRequestsData: [],
        activeTutors: 0,
        totalTutors: 0,
        weeklyUtilization: 0,
        topSubjects: [],
        weeklyHours: { tutoring: 0, coaching: 0 },
        needsCompletion: 0,
        needsConfirmation: 0,
        uniqueStudents: 0,
        pendingRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0,
        availableTutors: 0,
    });
    const [showCalendarModal, setShowCalendarModal] = useState(false);

    // fetch data from diff roles - memoise to optimise JSX re-render unless the email or role changes
    const fetchDashboardData = useCallback(async () => {
        if (!session?.user?.email) return;

        try {
            const fetchByRole = {
                teacher: () => fetchDashboardFirestoreDataTeacher(new Date()),
                tutor: () => fetchDashboardFirestoreDataTutor(session.user.email, new Date()),
                student: () => fetchDashboardFirestoreDataStudent(session.user.email, new Date()),
            };

            const data = await fetchByRole[userRole]?.();
            setDashboardData(data);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    }, [session.user.email, userRole]);

    // fetch initial state variables
    useEffect(() => {
        fetchDashboardData();
    }, [session.user.email, userRole, fetchDashboardData]);

    // fetch only if window is refocused
    useEffect(() => {
        const handleFocus = () => {
            fetchDashboardData();
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [fetchDashboardData]);

    return (
        <div className="container-fluid p-0">
            {/* Stats Cards */}
            <StatsCards userRole={userRole} data={dashboardData} onUpdate={fetchDashboardData} />

            {/* <div className="d-flex justify-content-start mb-3">
                <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => setShowCalendarModal(true)}
                >
                    Sync Calendar
                </button>
            </div> */}

            <PersonalCalendarModal
                show={showCalendarModal}
                onHide={() => setShowCalendarModal(false)}
            />
            
            {/* Today's Events */}
            <div className="row mb-4">
                <div className="col-12">
                    <EventsList
                        events={dashboardData.todayEvents}
                        title="Events for Today"
                        emptyMessage="No events scheduled for today"
                        userRole={userRole}
                        isToday={true}
                    />
                </div>
            </div>


            {/* Upcoming Events */}
            <div className="row">
                <div className="col-12">
                    <EventsList
                        events={dashboardData.upcomingEvents}
                        title="Upcoming Events"
                        emptyMessage="No upcoming events scheduled"
                        userRole={userRole}
                        isToday={false}
                    />
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;
