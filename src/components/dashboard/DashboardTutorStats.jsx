import { formatDuration } from '@/lib/scheduling/hours';
import { FiCalendar, FiUsers, FiAlertCircle, FiActivity } from '@/components/icons';
import { format, startOfWeek, endOfWeek } from 'date-fns';
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
            subtitle={`${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'dd/MM/yy')} - ${format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'dd/MM/yy')}`}
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
