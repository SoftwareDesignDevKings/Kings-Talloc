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

        // Warm the calendar's code while idle so opening it doesn't stop on a spinner.
        // Static chunks don't pass through the middleware or its rate limit.
        const warm = () => import('@/components/calendar/CalendarWrapper');
        const idle = window.requestIdleCallback ? window.requestIdleCallback(warm) : window.setTimeout(warm, 1500);
        return () => (window.cancelIdleCallback ? window.cancelIdleCallback(idle) : window.clearTimeout(idle));
    }, [router, userRole]);
}
