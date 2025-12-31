'use client';

import DashboardOverview from '@/components/DashboardOverview';
import useAuthSession from '@/hooks/useAuthSession';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const DashboardPage = () => {
    const { device } = useAuthSession()
    const router = useRouter();

    // Redirect mobile users to calendar (once on mount)
    useEffect(() => {
        if (device === "mobile") {
            router.replace('/calendar');
        }
    }, [device, router]);

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