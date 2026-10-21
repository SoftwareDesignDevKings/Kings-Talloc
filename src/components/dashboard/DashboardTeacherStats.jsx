import { Calendar, Users01, AlertCircle } from '@untitledui/icons';
import BaseStatsCard from './cards/BaseStatsCard';
import PendingApprovalsCard from './cards/PendingApprovalsCard';

const DashboardTeacherStats = ({ data }) => (
    <>
        <PendingApprovalsCard
            count={data.teacherStats.pendingRequests.length}
            pendingRequests={data.teacherStats.pendingRequests}
            delay={50}
        />
        <BaseStatsCard
            icon={Calendar}
            color="brand"
            title="Student tutor sessions"
            value={data.teacherStats.studentSessions}
            delay={150}
        />
        <BaseStatsCard
            icon={AlertCircle}
            color="warning"
            title="Uncompleted tutor sessions"
            value={data.teacherStats.uncompletedShifts}
            delay={250}
        />
        <BaseStatsCard
            icon={Users01}
            color="brand"
            title="Tutors on My Students"
            value={data.teacherStats.uniqueTutors}
            delay={350}
        />
    </>
);

export default DashboardTeacherStats;
