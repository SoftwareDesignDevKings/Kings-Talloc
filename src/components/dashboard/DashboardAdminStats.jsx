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
            value={(data.weeklyHours.tutoring + data.weeklyHours.coaching + data.weeklyHours.work).toFixed(1)}
            subtitle={`T: ${data.weeklyHours.tutoring} | C: ${data.weeklyHours.coaching} | W: ${data.weeklyHours.work}`}
            delay={250}
            colClass={ADMIN_COL}
        />
        <BaseStatsCard
            icon={FiCheckCircle}
            iconBgColor="bg-success"
            title="Completed Hours"
            value={(data.completedHours.tutoring + data.completedHours.coaching + data.completedHours.work).toFixed(1)}
            subtitle={`T: ${data.completedHours.tutoring} | C: ${data.completedHours.coaching} | W: ${data.completedHours.work}`}
            delay={350}
            colClass={ADMIN_COL}
        />
        <BaseStatsCard
            icon={FiClock}
            iconBgColor="bg-warning"
            title="Allocated Hours (Next Week)"
            value={(data.nextWeekHours.tutoring + data.nextWeekHours.coaching + data.nextWeekHours.work).toFixed(1)}
            subtitle={`T: ${data.nextWeekHours.tutoring} | C: ${data.nextWeekHours.coaching} | W: ${data.nextWeekHours.work}`}
            delay={400}
            colClass={ADMIN_COL}
        />
    </>
);

export default DashboardAdminStats;
