import React from 'react';
import { DashboardLoadingContext } from './DashboardLoadingContext';
import styles from '@/styles/dashboard.module.css';
import DashboardAdminStats from './DashboardAdminStats';
import DashboardTeacherStats from './DashboardTeacherStats';
import DashboardTutorStats from './DashboardTutorStats';
import DashboardStudentStats from './DashboardStudentStats';

const DashboardStatsCards = ({ userRole, data, onUpdate, isLoading = false, requestsLoading = false }) => (
    <DashboardLoadingContext.Provider value={{ shiftsLoading: isLoading, requestsLoading }}>
    <div className={styles.statsGrid} data-role={userRole}>
        {userRole === 'admin' && <DashboardAdminStats data={data} onUpdate={onUpdate} />}
        {userRole === 'teacher' && <DashboardTeacherStats data={data} />}
        {(userRole === 'tutor' || userRole === 'coach') && <DashboardTutorStats data={data} />}
        {userRole === 'student' && <DashboardStudentStats data={data} />}
    </div>
    </DashboardLoadingContext.Provider>
);

export default DashboardStatsCards;
