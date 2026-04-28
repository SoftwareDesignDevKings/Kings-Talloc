import React from 'react';
import {
    FiCalendar,
    FiUsers,
    FiClock,
    FiCheckCircle,
    FiAlertCircle,
    FiActivity,
} from '@/components/icons';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import StatsCard from './cards/StatsCard';
import PendingApprovalsCard from './cards/PendingApprovalsCard';

const DashboardAdminStats = ({ data, onUpdate }) => (
    <>
        <StatsCard
            icon={FiCalendar}
            iconBgColor="bg-primary"
            title="Upcoming Events"
            value={data.upcomingEventsCount}
            delay={50}
        />

        <PendingApprovalsCard
            count={data.unapprovedStudentRequests}
            pendingRequests={data.pendingRequestsData}
            onUpdate={onUpdate}
        />

        <StatsCard
            icon={FiUsers}
            iconBgColor="bg-info"
            title="Tutors In Today"
            value={data.tutorsScheduledToday}
            delay={200}
        />
        <StatsCard
            icon={FiActivity}
            iconBgColor="bg-success"
            title="Total Allocated Hours"
            value={(data.weeklyHours.tutoring + data.weeklyHours.coaching + data.weeklyHours.work).toFixed(1)}
            subtitle={`T: ${data.weeklyHours.tutoring} | C: ${data.weeklyHours.coaching} | W: ${data.weeklyHours.work}`}
            delay={250}
        />
    </>
);

const DashboardTeacherStats = ({ data }) => (
    <>
        <PendingApprovalsCard
            count={data.teacherStats.pendingRequests.length}
            pendingRequests={data.teacherStats.pendingRequests}
            readOnly
            delay={50}
        />
        <StatsCard
            icon={FiCalendar}
            iconBgColor="bg-primary"
            title="Student Tutor Sessions"
            value={data.teacherStats.studentSessions}
            delay={150}
        />
        <StatsCard
            icon={FiAlertCircle}
            iconBgColor="bg-warning"
            title="Uncompleted Tutor Sessions"
            value={data.teacherStats.uncompletedShifts}
            delay={250}
        />
        <StatsCard
            icon={FiUsers}
            iconBgColor="bg-info"
            title="Tutors on My Students"
            value={data.teacherStats.uniqueTutors}
            delay={350}
        />
    </>
);

const DashboardTutorStats = ({ data }) => (
    <>
        <StatsCard
            icon={FiCalendar}
            iconBgColor="bg-primary"
            title="Upcoming Sessions"
            value={data.upcomingEventsCount}
            delay={50}
        />
        <StatsCard
            icon={FiActivity}
            iconBgColor="bg-success"
            title="Total Hours"
            value={(data.weeklyHours.tutoring + data.weeklyHours.coaching + data.weeklyHours.work).toFixed(1)}
            subtitle={`T: ${data.weeklyHours.tutoring} | C: ${data.weeklyHours.coaching} | W: ${data.weeklyHours.work}`}
            delay={150}
        />
        <StatsCard
            icon={FiAlertCircle}
            iconBgColor="bg-warning"
            title="Uncompleted Shifts"
            value={data.uncompletedShifts}
            subtitle={`${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'dd/MM/yy')} - ${format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'dd/MM/yy')}`}
            delay={250}
        />
        <StatsCard
            icon={FiUsers}
            iconBgColor="bg-info"
            title="Students Helped"
            value={data.uniqueStudents}
            delay={350}
        />
        {data.needsConfirmation > 0 && (
            <div className="col-12">
                <div className="alert alert-warning mb-0 d-flex align-items-center">
                    <FiAlertCircle className="me-2" size={20} />
                    <span>
                        You have {data.needsConfirmation} event(s) requiring your confirmation
                    </span>
                </div>
            </div>
        )}
    </>
);

const DashboardStudentStats = ({ data }) => (
    <>
        <StatsCard
            icon={FiCalendar}
            iconBgColor="bg-primary"
            title="Upcoming Sessions"
            value={data.upcomingEventsCount}
            delay={50}
        />
        <StatsCard
            icon={FiActivity}
            iconBgColor="bg-success"
            title="Total Hours"
            value={(data.weeklyHours.tutoring + data.weeklyHours.coaching + data.weeklyHours.work).toFixed(1)}
            subtitle={`T: ${data.weeklyHours.tutoring} | C: ${data.weeklyHours.coaching} | W: ${data.weeklyHours.work}`}
            delay={150}
        />
        <StatsCard
            icon={FiClock}
            iconBgColor="bg-warning"
            title="Pending Requests"
            value={data.pendingRequests}
            delay={250}
        />
        <StatsCard
            icon={FiCheckCircle}
            iconBgColor="bg-success"
            title="Approved Requests"
            value={data.approvedRequests}
            delay={350}
        />
    </>
);

const DashboardStatsCards = ({ userRole, data, onUpdate }) => {
    return (
        <div className="row g-4 mb-4">
            {userRole === 'admin' && <DashboardAdminStats data={data} onUpdate={onUpdate} />}
            {userRole === 'teacher' && <DashboardTeacherStats data={data} />}
            {userRole === 'tutor' && <DashboardTutorStats data={data} />}
            {userRole === 'student' && <DashboardStudentStats data={data} />}
        </div>
    );
};

export default DashboardStatsCards;
