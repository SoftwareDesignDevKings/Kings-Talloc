'use client';

import DashboardOverview from '@/components/DashboardOverview';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import useAuthSession from '@/hooks/useAuthSession';

const ROLE_ROUTES = {
    admin: ['/calendar', '/userRoles', '/classes', '/subjects', '/tutorHours'],
    teacher: ['/calendar', '/classes', '/subjects'],
    tutor: ['/calendar', '/tutorHours'],
    coach: ['/calendar', '/tutorHours'],
    student: ['/calendar'],
};

const DashboardPage = () => {
    const router = useRouter();
    const { userRole } = useAuthSession();

    useEffect(() => {
        const routes = ROLE_ROUTES[userRole] ?? ['/calendar'];
        routes.forEach((route) => router.prefetch(route));
    }, [router, userRole]);

    return (
        <div className="overflow-y-auto overflow-x-hidden h-100">
            <DashboardOverview />
        </div>
    );
};

export default DashboardPage;
