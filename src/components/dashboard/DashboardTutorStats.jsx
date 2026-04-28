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
            value={(data.weeklyHours.tutoring + data.weeklyHours.coaching + data.weeklyHours.work).toFixed(1)}
            subtitle={`T: ${data.weeklyHours.tutoring} | C: ${data.weeklyHours.coaching} | W: ${data.weeklyHours.work}`}
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
        {data.needsConfirmation > 0 && (
            <div className="col-12">
                <div className="alert alert-warning mb-0 d-flex align-items-center">
                    <FiAlertCircle className="me-2" size={20} />
                    <span>
                        You have {data.needsConfirmation} event(s) requiring your confirmation
                    </span>
                </div>
            </div>
        )}
    </>
);

export default DashboardTutorStats;
