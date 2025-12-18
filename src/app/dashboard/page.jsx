'use client';

import DashboardOverview from '@/components/DashboardOverview';
import useAuthSession from '@/hooks/useAuthSession';
import { useRouter } from 'next/navigation';

const DashboardPage = () => {
    const { device } = useAuthSession()
    const router = useRouter();
    if (device === "mobile") {
        router.replace('/calendar');
    }

    return (
        <div className="overflow-y-auto overflow-x-hidden h-100">
            <DashboardOverview />
        </div>
    );
};

export default DashboardPage;