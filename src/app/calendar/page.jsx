'use client';

import React, { Suspense, lazy } from 'react';
import { useAuthSession } from '@/hooks/useAuthSession';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

const CalendarWrapper = lazy(() => import('@/components/CalendarWrapper.jsx'));

const CalendarPage = () => {
    const { session, userRole } = useAuthSession();

    if (!session?.user?.email || !userRole) {
        return <LoadingSpinner />;
    }

    console.log("Rendering CalendarPage for user:", session.user.email, "with role:", userRole);

    return (
        <div className="flex-grow-1 d-flex flex-column">
            <h1 className="text-center my-4">Calendar</h1>
            <Suspense fallback={<LoadingSpinner />}>
                <CalendarWrapper
                    userRole={userRole}
                    userEmail={session.user.email}
                />
            </Suspense>
        </div>
    );
};

export default CalendarPage;
