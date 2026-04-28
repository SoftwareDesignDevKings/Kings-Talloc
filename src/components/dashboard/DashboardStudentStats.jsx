import { FiCalendar, FiClock, FiCheckCircle, FiActivity } from '@/components/icons';
import BaseStatsCard from './cards/BaseStatsCard';

const DashboardStudentStats = ({ data }) => (
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
            value={(data.weeklyHours.tutoring + data.weeklyHours.coaching + data.weeklyHours.work).toFixed(1)}
            subtitle={`T: ${data.weeklyHours.tutoring} | C: ${data.weeklyHours.coaching} | W: ${data.weeklyHours.work}`}
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
