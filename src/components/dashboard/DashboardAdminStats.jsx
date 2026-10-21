import { formatDuration } from '@/lib/scheduling/hours';
import { Calendar, Users01, Activity, CheckCircle, Clock } from '@untitledui/icons';
import BaseStatsCard from './cards/BaseStatsCard';
import PendingApprovalsCard from './cards/PendingApprovalsCard';

const ADMIN_COL = 'col-12 col-sm-6 col-lg';

const DashboardAdminStats = ({ data, onUpdate }) => (
    <>
        <BaseStatsCard
            icon={Calendar}
            color="brand"
            title="Upcoming events"
            value={data.upcomingEventsCount}
            subtitle={data.upcomingPeriod}
            delay={50}
            colClass={ADMIN_COL}
        />
        <PendingApprovalsCard
            count={data.unapprovedStudentRequests}
            pendingRequests={data.pendingRequestsData}
            onUpdate={onUpdate}
            colClass={ADMIN_COL}
        />
        <BaseStatsCard
            icon={Users01}
            color="brand"
            title="Tutors in today"
            value={data.tutorsScheduledToday}
            delay={200}
            colClass={ADMIN_COL}
        />
        <BaseStatsCard
            icon={Activity}
            color="success"
            title="Total allocated hours"
            value={formatDuration((data.weeklyHours.work + data.weeklyHours.coaching) * 3600000)}
            subtitle={`Work: ${formatDuration(data.weeklyHours.work * 3600000)} | Coaching: ${formatDuration(data.weeklyHours.coaching * 3600000)}`}
            delay={250}
            colClass={ADMIN_COL}
        />
        <BaseStatsCard
            icon={CheckCircle}
            color="success"
            title="Completed hours"
            value={formatDuration((data.completedHours.work + data.completedHours.coaching) * 3600000)}
            subtitle={`Work: ${formatDuration(data.completedHours.work * 3600000)} | Coaching: ${formatDuration(data.completedHours.coaching * 3600000)}`}
            delay={350}
            colClass={ADMIN_COL}
        />
        <BaseStatsCard
            icon={Clock}
            color="warning"
            title="Allocated hours (next week)"
            value={formatDuration((data.nextWeekHours.work + data.nextWeekHours.coaching) * 3600000)}
            subtitle={`Work: ${formatDuration(data.nextWeekHours.work * 3600000)} | Coaching: ${formatDuration(data.nextWeekHours.coaching * 3600000)}`}
            delay={400}
            colClass={ADMIN_COL}
        />
    </>
);

export default DashboardAdminStats;
