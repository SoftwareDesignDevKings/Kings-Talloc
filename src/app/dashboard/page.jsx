'use client';

import DashboardOverview from '@/components/DashboardOverview';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const DashboardPage = () => {
    const router = useRouter();

    // download JS bundle ahead of time - enabled quicker hydration
    useEffect(() => {
        router.prefetch('/calendar');
    }, [router]);

    return (
        <div className="overflow-y-auto overflow-x-hidden h-100">
            <DashboardOverview />
        </div>
    );
};

export default DashboardPage;