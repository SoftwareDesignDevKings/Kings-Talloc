import React from 'react';
import DashboardAdminStats from './DashboardAdminStats';
import DashboardTeacherStats from './DashboardTeacherStats';
import DashboardTutorStats from './DashboardTutorStats';
import DashboardStudentStats from './DashboardStudentStats';

const DashboardStatsCards = ({ userRole, data, onUpdate }) => (
    <div className="row g-4 mb-4 align-items-stretch">
        {userRole === 'admin' && <DashboardAdminStats data={data} onUpdate={onUpdate} />}
        {userRole === 'teacher' && <DashboardTeacherStats data={data} />}
        {userRole === 'tutor' && <DashboardTutorStats data={data} />}
        {userRole === 'student' && <DashboardStudentStats data={data} />}
    </div>
);

export default DashboardStatsCards;
