import { formatDuration } from '@/lib/scheduling/hours';
import { FiCalendar, FiUsers, FiActivity, FiCheckCircle, FiClock } from '@/components/icons';
import BaseStatsCard from './cards/BaseStatsCard';
import PendingApprovalsCard from './cards/PendingApprovalsCard';

const ADMIN_COL = 'col-12 col-sm-6 col-lg';

const DashboardAdminStats = ({ data, onUpdate }) => (
    <>
        <BaseStatsCard
            icon={FiCalendar}
            iconBgColor="bg-primary"
            title="Upcoming Events"
            value={data.upcomingEventsCount}
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
            icon={FiUsers}
            iconBgColor="bg-info"
            title="Tutors In Today"
            value={data.tutorsScheduledToday}
            delay={200}
            colClass={ADMIN_COL}
        />
        <BaseStatsCard
            icon={FiActivity}
            iconBgColor="bg-success"
            title="Total Allocated Hours"
            value={formatDuration((data.weeklyHours.work + data.weeklyHours.coaching) * 3600000)}
            subtitle={`Work: ${formatDuration(data.weeklyHours.work * 3600000)} | Coaching: ${formatDuration(data.weeklyHours.coaching * 3600000)}`}
            delay={250}
            colClass={ADMIN_COL}
        />
        <BaseStatsCard
            icon={FiCheckCircle}
            iconBgColor="bg-success"
            title="Completed Hours"
            value={formatDuration((data.completedHours.work + data.completedHours.coaching) * 3600000)}
            subtitle={`Work: ${formatDuration(data.completedHours.work * 3600000)} | Coaching: ${formatDuration(data.completedHours.coaching * 3600000)}`}
            delay={350}
            colClass={ADMIN_COL}
        />
        <BaseStatsCard
            icon={FiClock}
            iconBgColor="bg-warning"
            title="Allocated Hours (Next Week)"
            value={formatDuration((data.nextWeekHours.work + data.nextWeekHours.coaching) * 3600000)}
            subtitle={`Work: ${formatDuration(data.nextWeekHours.work * 3600000)} | Coaching: ${formatDuration(data.nextWeekHours.coaching * 3600000)}`}
            delay={400}
            colClass={ADMIN_COL}
        />
    </>
);

export default DashboardAdminStats;
