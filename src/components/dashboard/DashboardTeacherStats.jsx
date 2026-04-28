import { FiCalendar, FiUsers, FiAlertCircle } from '@/components/icons';
import BaseStatsCard from './cards/BaseStatsCard';
import PendingApprovalsCard from './cards/PendingApprovalsCard';

const DashboardTeacherStats = ({ data }) => (
    <>
        <PendingApprovalsCard
            count={data.teacherStats.pendingRequests.length}
            pendingRequests={data.teacherStats.pendingRequests}
            readOnly
            delay={50}
        />
        <BaseStatsCard
            icon={FiCalendar}
            iconBgColor="bg-primary"
            title="Student Tutor Sessions"
            value={data.teacherStats.studentSessions}
            delay={150}
        />
        <BaseStatsCard
            icon={FiAlertCircle}
            iconBgColor="bg-warning"
            title="Uncompleted Tutor Sessions"
            value={data.teacherStats.uncompletedShifts}
            delay={250}
        />
        <BaseStatsCard
            icon={FiUsers}
            iconBgColor="bg-info"
            title="Tutors on My Students"
            value={data.teacherStats.uniqueTutors}
            delay={350}
        />
    </>
);

export default DashboardTeacherStats;
