'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ROLE_ROUTES = {
    admin:   ['/dashboard', '/calendar', '/userRoles', '/classes', '/tutorHours'],
    teacher: ['/dashboard', '/calendar', '/classes'],
    tutor:   ['/dashboard', '/calendar', '/tutorHours'],
    coach:   ['/dashboard', '/calendar', '/tutorHours'],
    student: ['/dashboard', '/calendar'],
};

export default function usePrefetchRoutes(userRole) {
    const router = useRouter();

    useEffect(() => {
        if (!userRole) return;
        const routes = ROLE_ROUTES[userRole] ?? ['/dashboard', '/calendar'];
        routes.forEach((route) => router.prefetch(route));
    }, [router, userRole]);
}
