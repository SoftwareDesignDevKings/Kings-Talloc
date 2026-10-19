'use client';

import { calculateHours } from '@/lib/scheduling/hours';
import BookingNotices from '@/components/dashboard/BookingNotices';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import useAuthSession from '@/hooks/useAuthSession';
import DashboardStatsCards from '@/components/dashboard/DashboardStatsCards.jsx';
import EventsList from '@/components/dashboard/EventsList.jsx';
import WelcomeModal from '@/components/modals/WelcomeModal.jsx';
import ReLoginModal from '@/components/modals/ReLoginModal.jsx';
import useAlert from '@/hooks/useAlert';
import { useAppData } from '@/contexts/AppDataContext';
import { addWeeks, endOfWeek, isWithinInterval, startOfWeek } from 'date-fns';
import { formatDisplayDate } from '@/utils/displayDate';
import { fetchCacheClasses } from '@/firestore/firestoreFetch';

import { Button } from '@/components/untitled/button';
import styles from '@/styles/dashboard.module.css';

const DashboardOverview = () => {
    const { session, userRole, userRoles } = useAuthSession();
    const isAdmin = userRole === 'admin' || userRoles?.includes('admin');
    const { addAlert } = useAlert();
    const [needsReauth, setNeedsReauth] = useState(false);
    const [isSendingEmails, setIsSendingEmails] = useState(false);
    const notificationActionsRef = useRef(null);
    const reauthWasOpen = useRef(false);

    useEffect(() => {
        if (needsReauth) {
            reauthWasOpen.current = true;
        } else if (reauthWasOpen.current) {
            reauthWasOpen.current = false;
            // The async request disables the trigger before opening the dialog.
            // Return keyboard focus to it when the dialog closes.
            notificationActionsRef.current?.querySelector('button')?.focus();
        }
    }, [needsReauth]);
    const {
        calendarShifts,
        calendarStudentRequests,
        calendarAvailabilities,
        setCalendarDateRange,
    } = useAppData();

    const [teacherClasses, setTeacherClasses] = useState([]);

    useEffect(() => {
        if (userRole !== 'teacher' || !session.user.email) return;
        fetchCacheClasses().then(setTeacherClasses);
    }, [userRole, session.user.email]);

    // Ensure we are viewing through the end of next week so dashboard cards can include next-week stats.
    useEffect(() => {
        const now = new Date();
        setCalendarDateRange({
            start: startOfWeek(now, { weekStartsOn: 1 }),
            end: endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 }),
        });
    }, [setCalendarDateRange]);

    // Compute Dashboard Statistics from AppData (Client-Side)
    const dashboardData = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(now);
        endOfToday.setHours(23, 59, 59, 999);
        const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
        const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
        const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
        const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });

        // Filter events
        const todayEvents = [];
        const upcomingEvents = [];
        let completedShifts = 0;
        let uncompletedTodayEvents = 0;
        let uncompletedShifts = 0;
        const uniqueStudentEmails = new Set();
        const uniqueTutorEmailsToday = new Set();
        const classCounts = new Map();

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

            // 1. Today's Events
            if (isToday) {
                todayEvents.push(event);
                if (event.workStatus !== 'completed') {
                    uncompletedTodayEvents++;
                }
            }

            // 2. Count every upcoming event; limit only the sorted preview below.
            if (isFuture) {
                upcomingEvents.push(event);
            }

            // 3. Completion tracking
            if (event.workStatus === 'completed') {
                if (end < now) completedShifts++;
            } else if (end < now) {
                uncompletedShifts++;
            }

            // 5. Unique Students (for Tutor View)
            event.students?.forEach(s => uniqueStudentEmails.add(s.value));

            // 5. Tutors scheduled today
            if (isToday) {
                event.staff?.forEach(s => uniqueTutorEmailsToday.add(s.value || s));
            }

            // 7. Class Counts (for Teacher View)
            if (event.classes?.length) {
                event.classes.forEach((cls) => {
                    const className = cls.label || cls.name || cls.value || 'Unknown';
                    classCounts.set(className, (classCounts.get(className) || 0) + 1);
                });
            }
        });

        // Top Classes
        const topSubjects = Array.from(classCounts.entries())
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
            const eventStart = new Date(event.start);
            if (!isWithinInterval(eventStart, { start: currentWeekStart, end: currentWeekEnd })) {
                return acc;
            }
            return acc + ((new Date(event.end) - eventStart) / 3600000);
        }, 0);

        const weeklyUtilization = totalAvailableHours > 0 
            ? Math.round((totalBookedHours / totalAvailableHours) * 100) 
            : 0;

        // Teacher stats
        const teacherStudentEmails = new Set(
            teacherClasses.flatMap(c => (c.students || []).map(s => s.email))
        );
        const teacherShifts = calendarShifts.filter(event =>
            event.students?.some(s => teacherStudentEmails.has(s.value || s.email)) ||
            event.staff?.some(s => (s.value || s) === session?.user?.email)
        );
        const teacherStudentSessions = teacherShifts.length;
        const teacherUncompletedShifts = teacherShifts.filter(event =>
            new Date(event.end) < now && event.workStatus !== 'completed'
        ).length;
        const teacherUniqueTutors = new Set(
            teacherShifts.flatMap(event => (event.staff || []).map(s => s.value || s))
        ).size;
        const teacherPendingRequests = pendingRequestsData.filter(req =>
            req.students?.some(s => teacherStudentEmails.has(s.value || s.email))
        );

        const allocation = (start, end) => {
            const result = calculateHours(calendarShifts.filter(event => isWithinInterval(new Date(event.start), { start, end })), { completedOnly: false });
            return { tutoring: 0, work: result.tutors.reduce((sum, tutor) => sum + tutor.workMs / 3600000, 0), coaching: result.tutors.reduce((sum, tutor) => sum + tutor.coachingMs / 3600000, 0) };
        };
        const completed = calculateHours(calendarShifts.filter(event => isWithinInterval(new Date(event.start), { start: currentWeekStart, end: currentWeekEnd })));
        const completedWorkHours = completed.tutors.reduce((sum, tutor) => sum + tutor.workMs / 3600000, 0);
        const completedCoachingHours = completed.tutors.reduce((sum, tutor) => sum + tutor.coachingMs / 3600000, 0);
        return {
            todayEvents: todayEvents.sort((a, b) => new Date(a.start) - new Date(b.start)),
            upcomingEvents: upcomingEvents.sort((a, b) => new Date(a.start) - new Date(b.start)).slice(0, 5),
            upcomingEventsCount: upcomingEvents.length,
            upcomingPeriod: `Through ${formatDisplayDate(nextWeekEnd)}`,
            unapprovedStudentRequests: pendingRequestsData.length,
            pendingRequestsData: pendingRequestsData,
            uncompletedTodayEvents,
            weeklyUtilization,
            topSubjects,
            weeklyHours: allocation(currentWeekStart, currentWeekEnd),
            nextWeekHours: allocation(nextWeekStart, nextWeekEnd),
            completedHours: {
                tutoring: 0,
                coaching: completedCoachingHours,
                work: completedWorkHours,
            },
            completedShifts,
            uncompletedShifts,
            uniqueStudents: uniqueStudentEmails.size,
            pendingRequests: pendingRequestsData.length,
            // Approval moves the request into shifts, so count its approved session.
            approvedRequests: calendarShifts.filter(event => event.createdByStudent && event.approvalStatus === 'approved').length,
            tutorsScheduledToday: uniqueTutorEmailsToday.size,
            teacherStats: {
                studentSessions: teacherStudentSessions,
                uncompletedShifts: teacherUncompletedShifts,
                uniqueTutors: teacherUniqueTutors,
                pendingRequests: teacherPendingRequests,
            },
        };

    }, [calendarShifts, calendarStudentRequests, calendarAvailabilities, session?.user?.email, teacherClasses]);


    const handleSendEmailNotifications = async () => {
        if (isSendingEmails) return;

        setIsSendingEmails(true);
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
        } finally {
            setIsSendingEmails(false);
        }
    };

    return (
        <div className={styles.section}>

            <BookingNotices />
            {/* Stats Cards */}
            {/* We don't need onUpdate anymore because the AppDataProvider updates automatically via listeners */}
            <DashboardStatsCards userRole={userRole} data={dashboardData} />

            <ReLoginModal
                show={needsReauth}
                onHide={() => setNeedsReauth(false)}
            />

            {isAdmin && (
                <div ref={notificationActionsRef} className={styles.notificationActions}>
                    <Button size="sm" color="secondary" onClick={handleSendEmailNotifications}
                        isDisabled={isSendingEmails} aria-busy={isSendingEmails}>
                        {isSendingEmails ? 'Sending Shift Notifications...' : 'Email Shift Notifications'}
                    </Button>
                </div>
            )}

            <WelcomeModal
                userEmail={session?.user?.email}
                userRole={userRole}
            />

            {/* Today's Events */}
            <EventsList
                events={dashboardData.todayEvents}
                title="Events for Today"
                emptyMessage="No events scheduled for today"
                userRole={userRole}
                isToday={true}
            />

            {/* Upcoming Events */}
            <EventsList
                events={dashboardData.upcomingEvents}
                totalCount={dashboardData.upcomingEventsCount}
                title="Upcoming Events"
                emptyMessage="No upcoming events scheduled"
                userRole={userRole}
                isToday={false}
            />
        </div>
    );
};

export default DashboardOverview;
