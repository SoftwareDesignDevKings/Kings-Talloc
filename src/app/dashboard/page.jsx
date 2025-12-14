'use client';

import DashboardOverview from '@/components/DashboardOverview';

const DashboardPage = () => {
    return (
        <div className="overflow-y-auto overflow-x-hidden h-100">
            <DashboardOverview />
        </div>
    );
};

export default DashboardPage;