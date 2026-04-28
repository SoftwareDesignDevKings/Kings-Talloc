import { FiCalendar, FiUsers, FiActivity } from '@/components/icons';
import BaseStatsCard from './cards/BaseStatsCard';
import PendingApprovalsCard from './cards/PendingApprovalsCard';

const DashboardAdminStats = ({ data, onUpdate }) => (
    <>
        <BaseStatsCard
            icon={FiCalendar}
            iconBgColor="bg-primary"
            title="Upcoming Events"
            value={data.upcomingEventsCount}
            delay={50}
        />
        <PendingApprovalsCard
            count={data.unapprovedStudentRequests}
            pendingRequests={data.pendingRequestsData}
            onUpdate={onUpdate}
        />
        <BaseStatsCard
            icon={FiUsers}
            iconBgColor="bg-info"
            title="Tutors In Today"
            value={data.tutorsScheduledToday}
            delay={200}
        />
        <BaseStatsCard
            icon={FiActivity}
            iconBgColor="bg-success"
            title="Total Allocated Hours"
            value={(data.weeklyHours.tutoring + data.weeklyHours.coaching + data.weeklyHours.work).toFixed(1)}
            subtitle={`T: ${data.weeklyHours.tutoring} | C: ${data.weeklyHours.coaching} | W: ${data.weeklyHours.work}`}
            delay={250}
        />
    </>
);

export default DashboardAdminStats;
