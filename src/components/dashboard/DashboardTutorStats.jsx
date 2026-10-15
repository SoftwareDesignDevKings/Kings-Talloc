import { formatDuration } from '@/lib/scheduling/hours';
import { FiCalendar, FiUsers, FiAlertCircle, FiActivity } from '@/components/icons';
import { startOfWeek, endOfWeek } from 'date-fns';
import { formatDisplayDate } from '@/utils/displayDate';
import BaseStatsCard from './cards/BaseStatsCard';

const DashboardTutorStats = ({ data }) => (
    <>
        <BaseStatsCard
            icon={FiCalendar}
            iconBgColor="bg-primary"
            title="Upcoming Sessions"
            value={data.upcomingEventsCount}
            delay={50}
        />
        <BaseStatsCard
            icon={FiActivity}
            iconBgColor="bg-success"
            title="Total Hours"
            value={formatDuration((data.weeklyHours.work + data.weeklyHours.coaching) * 3600000)}
            subtitle={`Work: ${formatDuration(data.weeklyHours.work * 3600000)} | Coaching: ${formatDuration(data.weeklyHours.coaching * 3600000)}`}
            delay={150}
        />
        <BaseStatsCard
            icon={FiAlertCircle}
            iconBgColor="bg-warning"
            title="Uncompleted Shifts"
            value={data.uncompletedShifts}
            subtitle={`${formatDisplayDate(startOfWeek(new Date(), { weekStartsOn: 1 }))} - ${formatDisplayDate(endOfWeek(new Date(), { weekStartsOn: 1 }))}`}
            delay={250}
        />
        <BaseStatsCard
            icon={FiUsers}
            iconBgColor="bg-info"
            title="Students Helped"
            value={data.uniqueStudents}
            delay={350}
        />
    </>
);

export default DashboardTutorStats;
