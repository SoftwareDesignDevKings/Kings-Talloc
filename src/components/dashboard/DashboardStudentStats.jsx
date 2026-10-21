import { formatDuration } from '@/lib/scheduling/hours';
import { Calendar, Clock, CheckCircle, Activity } from '@untitledui/icons';
import BaseStatsCard from './cards/BaseStatsCard';

const DashboardStudentStats = ({ data }) => (
    <>
        <BaseStatsCard
            icon={Calendar}
            color="brand"
            title="Upcoming sessions"
            value={data.upcomingEventsCount}
            subtitle={data.upcomingPeriod}
            delay={50}
        />
        <BaseStatsCard
            icon={Activity}
            color="success"
            title="Scheduled hours"
            value={formatDuration((data.weeklyHours.work + data.weeklyHours.coaching) * 3600000)}
            subtitle={`This week · Tutoring: ${formatDuration(data.weeklyHours.work * 3600000)} · Coaching: ${formatDuration(data.weeklyHours.coaching * 3600000)}`}
            delay={150}
        />
        <BaseStatsCard
            icon={Clock}
            color="warning"
            title="Pending requests"
            value={data.pendingRequests}
            delay={250}
        />
        <BaseStatsCard
            icon={CheckCircle}
            color="success"
            title="Approved requests"
            value={data.approvedRequests}
            delay={350}
        />
    </>
);

export default DashboardStudentStats;
