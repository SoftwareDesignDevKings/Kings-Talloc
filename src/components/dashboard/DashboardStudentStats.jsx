import { formatDuration } from '@/lib/scheduling/hours';
import { FiCalendar, FiClock, FiCheckCircle, FiActivity } from '@/components/icons';
import BaseStatsCard from './cards/BaseStatsCard';

const DashboardStudentStats = ({ data }) => (
    <>
        <BaseStatsCard
            icon={FiCalendar}
            iconBgColor="bg-primary"
            title="Upcoming Sessions"
            value={data.upcomingEventsCount}
            subtitle={data.upcomingPeriod}
            delay={50}
        />
        <BaseStatsCard
            icon={FiActivity}
            iconBgColor="bg-success"
            title="Scheduled Hours"
            value={formatDuration((data.weeklyHours.work + data.weeklyHours.coaching) * 3600000)}
            subtitle={`This week · Work: ${formatDuration(data.weeklyHours.work * 3600000)} | Coaching: ${formatDuration(data.weeklyHours.coaching * 3600000)}`}
            delay={150}
        />
        <BaseStatsCard
            icon={FiClock}
            iconBgColor="bg-warning"
            title="Pending Requests"
            value={data.pendingRequests}
            delay={250}
        />
        <BaseStatsCard
            icon={FiCheckCircle}
            iconBgColor="bg-success"
            title="Approved Requests"
            value={data.approvedRequests}
            delay={350}
        />
    </>
);

export default DashboardStudentStats;
