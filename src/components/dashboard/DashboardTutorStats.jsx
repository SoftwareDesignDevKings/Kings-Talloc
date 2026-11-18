import { formatDuration } from '@/lib/scheduling/hours';
import { Calendar, Users01, AlertCircle, Activity } from '@untitledui/icons';
import { startOfWeek, endOfWeek } from 'date-fns';
import { formatDisplayDate } from '@/utils/displayDate';
import BaseStatsCard from './cards/BaseStatsCard';

const DashboardTutorStats = ({ data }) => (
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
            subtitle={`This week · Work: ${formatDuration(data.weeklyHours.work * 3600000)} | Coaching: ${formatDuration(data.weeklyHours.coaching * 3600000)}`}
            delay={150}
        />
        <BaseStatsCard
            icon={AlertCircle}
            color="warning"
            title="Uncompleted shifts"
            value={data.uncompletedShifts}
            subtitle={`${formatDisplayDate(startOfWeek(new Date(), { weekStartsOn: 1 }))} - ${formatDisplayDate(endOfWeek(new Date(), { weekStartsOn: 1 }))}`}
            delay={250}
        />
        <BaseStatsCard
            icon={Users01}
            color="brand"
            title="Students helped"
            value={data.uniqueStudents}
            delay={350}
        />
    </>
);

export default DashboardTutorStats;
