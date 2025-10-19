import React from 'react';
import {
  FiCalendar, FiUsers, FiClock, FiCheckCircle,
  FiAlertCircle, FiTrendingUp, FiBookOpen, FiActivity
} from '@/components/icons';
import { format, startOfWeek, endOfWeek } from 'date-fns';

const StatCard = ({ icon: Icon, iconBgColor, title, value, subtitle }) => (
  <div className="col-12 col-md-4 col-lg-3">
    <div className="card border-0 shadow-sm">
      <div className="card-body">
        <div className="d-flex align-items-center">
          <div className="flex-shrink-0">
            <div className={`${iconBgColor} bg-opacity-10 rounded p-3`}>
              <Icon className={iconBgColor.replace('bg-', 'text-')} size={24} />
            </div>
          </div>
          <div className="flex-grow-1 ms-3">
            <h6 className="text-muted mb-1 small">{title}</h6>
            <h3 className="mb-0 fw-bold">{value}</h3>
            {subtitle && <small className="text-muted">{subtitle}</small>}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const TeacherStats = ({ data }) => (
  <>
    <StatCard
      icon={FiCalendar}
      iconBgColor="bg-primary"
      title="Upcoming Events"
      value={data.upcomingEventsCount}
    />
    <StatCard
      icon={FiClock}
      iconBgColor="bg-warning"
      title="Pending Approvals"
      value={data.unapprovedStudentRequests}
    />
    <StatCard
      icon={FiUsers}
      iconBgColor="bg-info"
      title="Active Tutors"
      value={`${data.activeTutors}/${data.totalTutors}`}
    />
    <StatCard
      icon={FiTrendingUp}
      iconBgColor="bg-success"
      title="Weekly Utilization"
      value={`${data.weeklyUtilization}%`}
    />
    {data.topSubjects?.length > 0 && (
      <div className="col-12">
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h6 className="text-muted mb-3 small d-flex align-items-center">
              <FiBookOpen className="me-2" /> Top Subjects This Week
            </h6>
            <div className="d-flex gap-3 flex-wrap">
              {data.topSubjects.map((subject, idx) => (
                <span key={idx} className="badge bg-primary px-3 py-2">
                  {subject.name} ({subject.count})
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}
  </>
);

const TutorStats = ({ data }) => (
  <>
    <StatCard
      icon={FiCalendar}
      iconBgColor="bg-primary"
      title="Upcoming Sessions"
      value={data.upcomingEventsCount}
    />
    <StatCard
      icon={FiActivity}
      iconBgColor="bg-success"
      title="Hours This Week"
      value={(data.weeklyHours.tutoring + data.weeklyHours.coaching).toFixed(1)}
      subtitle={`T: ${data.weeklyHours.tutoring} | C: ${data.weeklyHours.coaching}`}
    />
    <StatCard
      icon={FiAlertCircle}
      iconBgColor="bg-warning"
      title="Needs Completion"
      value={data.needsCompletion}
      subtitle={`${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'dd/MM/yy')} - ${format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'dd/MM/yy')}`}
    />
    <StatCard
      icon={FiUsers}
      iconBgColor="bg-info"
      title="Students Helped"
      value={data.uniqueStudents}
    />
    {data.needsConfirmation > 0 && (
      <div className="col-12">
        <div className="alert alert-warning mb-0 d-flex align-items-center">
          <FiAlertCircle className="me-2" size={20} />
          <span>You have {data.needsConfirmation} event(s) requiring your confirmation</span>
        </div>
      </div>
    )}
  </>
);

const StudentStats = ({ data }) => (
  <>
    <StatCard
      icon={FiCalendar}
      iconBgColor="bg-primary"
      title="Upcoming Sessions"
      value={data.upcomingEventsCount}
    />
    <StatCard
      icon={FiClock}
      iconBgColor="bg-warning"
      title="Pending Requests"
      value={data.pendingRequests}
    />
    <StatCard
      icon={FiCheckCircle}
      iconBgColor="bg-success"
      title="Approved Requests"
      value={data.approvedRequests}
    />
    <StatCard
      icon={FiUsers}
      iconBgColor="bg-info"
      title="Available Tutors"
      value={data.availableTutors}
    />
  </>
);

const StatsCards = ({ userRole, data }) => {
  return (
    <div className="row g-4 mb-4">
      {userRole === 'teacher' && <TeacherStats data={data} />}
      {userRole === 'tutor' && <TutorStats data={data} />}
      {userRole === 'student' && <StudentStats data={data} />}
    </div>
  );
};

export default StatsCards;
