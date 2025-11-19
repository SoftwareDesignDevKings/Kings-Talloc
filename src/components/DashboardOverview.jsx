'use client';

import React from 'react';
import { useDashboardData } from '@/hooks/dashboard/useDashboardData';
import StatsCards from '@/components/dashboard/StatsCards.jsx';
import EventsList from '@/components/dashboard/EventsList.jsx';

const DashboardOverview = ({ userRole, userEmail }) => {
    const { dashboardData, refetch } = useDashboardData(userRole, userEmail);

    return (
        <div className="container-fluid p-0">
            {/* Stats Cards */}
            <StatsCards userRole={userRole} data={dashboardData} onUpdate={refetch} />

            {/* Today's Events */}
            <div className="row mb-4">
                <div className="col-12">
                    <EventsList
                        events={dashboardData.todayEvents}
                        title="Events for Today"
                        emptyMessage="No events scheduled for today"
                        userRole={userRole}
                        isToday={true}
                    />
                </div>
            </div>

            {/* Upcoming Events */}
            <div className="row">
                <div className="col-12">
                    <EventsList
                        events={dashboardData.upcomingEvents}
                        title="Upcoming Events"
                        emptyMessage="No upcoming events scheduled"
                        userRole={userRole}
                        isToday={false}
                    />
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;
