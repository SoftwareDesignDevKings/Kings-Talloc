'use client';

import React, { useState, useEffect, useMemo } from 'react';
import useAuthSession from '@/hooks/useAuthSession';
import DashboardStatsCards from '@/components/dashboard/DashboardStatsCards.jsx';
import EventsList from '@/components/dashboard/EventsList.jsx';
import PersonalCalendarModal from '@/components/modals/PersonalCalendarModal.jsx';
import WelcomeModal from '@/components/modals/WelcomeModal.jsx';
import ReLoginModal from '@/components/modals/ReLoginModal.jsx';
import useAlert from '@/hooks/useAlert';
import { useAppData } from '@/contexts/AppDataContext';
import { startOfWeek, endOfWeek, isSameDay } from 'date-fns';

const DashboardOverview = () => {
    const { session, userRole, userRoles } = useAuthSession();
    const isAdmin = userRole === 'admin' || userRoles?.includes('admin');
    const { addAlert } = useAlert();
    const [needsReauth, setNeedsReauth] = useState(false);
    const {
        calendarShifts,
        calendarStudentRequests,
        calendarAvailabilities,
        setCalendarDateRange,
    } = useAppData();

    const [showCalendarModal, setShowCalendarModal] = useState(false);

    // Ensure we are viewing the current week when on the dashboard
    useEffect(() => {
        const now = new Date();
        setCalendarDateRange({
            start: startOfWeek(now, { weekStartsOn: 1 }),
            end: endOfWeek(now, { weekStartsOn: 1 }),
        });
    }, [setCalendarDateRange]);

    // Compute Dashboard Statistics from AppData (Client-Side)
    const dashboardData = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);

        // Filter events
        const todayEvents = [];
        const upcomingEvents = [];
        let completedShifts = 0;
        let uncompletedTodayEvents = 0;
        let uncompletedShifts = 0;
        let tutoringHours = 0;
        let coachingHours = 0;
        let needsConfirmation = 0;
        const uniqueStudentEmails = new Set();
        const uniqueTutorEmailsToday = new Set();
        const subjectCounts = new Map();

        // Pending Requests
        // Note: AppDataProvider only fetches requests for the current view range. 
        // If we need ALL pending requests globally, we might need a separate fetch or adjust the provider.
        // For now, we use what's in the current week view which covers most immediate concerns.
        const pendingRequestsData = calendarStudentRequests.filter(req => req.approvalStatus === 'pending');

        calendarShifts.forEach(event => {
            const start = new Date(event.start);
            const end = new Date(event.end);
            const isToday = start >= startOfToday && start <= endOfToday;
            const isFuture = start > now;
            const hours = (end - start) / 3600000;

            // 1. Today's Events
            if (isToday) {
                todayEvents.push(event);
                if (event.workStatus !== 'completed') {
                    uncompletedTodayEvents++;
                }
            }

            // 2. Upcoming Events (Limit 5)
            if (isFuture && upcomingEvents.length < 5) {
                upcomingEvents.push(event);
            }

            // 3. Completed & Hours
            if (event.workStatus === 'completed') {
                if (end < now) {
                    completedShifts++;
                }
            } else if (end < now && event.workStatus !== 'completed') {
                uncompletedShifts++;
            }

            // 4. Unique Students (for Tutor View)
            event.students?.forEach(s => uniqueStudentEmails.add(s.value));

            // 5. Tutors scheduled today
            if (isToday) {
                event.staff?.forEach(s => uniqueTutorEmailsToday.add(s.value || s));
            }

            // 6. Needs Confirmation (for Tutor View)
            if (userRole === 'tutor' && event.confirmationRequired) {
                 const hasResponse = event.tutorResponses?.some(
                    (resp) => resp.email === session?.user?.email && resp.response
                );
                if (!hasResponse) needsConfirmation++;
            }

            // 7. Subject Counts (for Teacher View)
            if (event.subject) {
                const subjectName = typeof event.subject === 'string' 
                    ? event.subject 
                    : event.subject.label || event.subject.value || 'Unknown';
                subjectCounts.set(subjectName, (subjectCounts.get(subjectName) || 0) + 1);
            }
        });

        // Top Subjects
        const topSubjects = Array.from(subjectCounts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        // Weekly Utilization (Teacher View)
        let totalAvailableHours = 0;
        calendarAvailabilities.forEach(avail => {
            const start = new Date(avail.start);
            const end = new Date(avail.end);
            totalAvailableHours += (end - start) / 3600000;
        });
        
        // Total booked hours (regardless of completion, for utilization)
        const totalBookedHours = calendarShifts.reduce((acc, event) => {
             return acc + ((new Date(event.end) - new Date(event.start)) / 3600000);
        }, 0);

        const weeklyUtilization = totalAvailableHours > 0 
            ? Math.round((totalBookedHours / totalAvailableHours) * 100) 
            : 0;

        return {
            todayEvents: todayEvents.sort((a, b) => a.start - b.start),
            upcomingEvents: upcomingEvents.sort((a, b) => a.start - b.start),
            upcomingEventsCount: upcomingEvents.length,
            unapprovedStudentRequests: pendingRequestsData.length,
            pendingRequestsData: pendingRequestsData,
            uncompletedTodayEvents,
            weeklyUtilization,
            topSubjects,
            weeklyHours: {
                tutoring: Math.round(tutoringHours * 10) / 10,
                coaching: Math.round(coachingHours * 10) / 10,
            },
            completedShifts,
            uncompletedShifts,
            needsConfirmation,
            uniqueStudents: uniqueStudentEmails.size,
            pendingRequests: pendingRequestsData.length,
            approvedRequests: 0, // Not tracking approved count historically in this view
            rejectedRequests: 0, // Not tracking rejected count in this view
            tutorsScheduledToday: uniqueTutorEmailsToday.size,
        };

    }, [calendarShifts, calendarStudentRequests, calendarAvailabilities, session?.user?.email, userRole]);


    const handleSendEmailNotifications = async () => {
        try {
            const response = await fetch('/api/send-emails', { method: 'POST' });
            const data = await response.json();

            if (data.error === 'REAUTH_REQUIRED') {
                setNeedsReauth(true);
                return;
            }

            if (response.status === 500) {
                addAlert('warning', data.message);
                return;
            }

            if (!response.ok) {
                throw new Error(data.message || 'Failed to send emails');
            }

            addAlert('success', data.message || 'Emails sent successfully');
        } catch (error) {
            addAlert('error', error.message || 'Failed to send emails');
        }
    };

    return (
        <div className="container-fluid p-0">

            {/* Stats Cards */}
            {/* We don't need onUpdate anymore because the AppDataProvider updates automatically via listeners */}
            <DashboardStatsCards userRole={userRole} data={dashboardData} />

            <PersonalCalendarModal
                show={showCalendarModal}
                onHide={() => setShowCalendarModal(false)}
            />

            <ReLoginModal
                show={needsReauth}
                onHide={() => setNeedsReauth(false)}
            />

            {isAdmin && (
                <div className="row mb-3">
                    <div className="col-12">
                        <button
                            className="btn btn-outline-success"
                            onClick={handleSendEmailNotifications}
                        >
                            Email Shift Notifications
                        </button>
                    </div>
                </div>
            )}

            <WelcomeModal
                userEmail={session?.user?.email}
                userRole={userRole}
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