'use client';

import React, { Suspense, lazy } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

const CalendarWrapper = lazy(() => import('@/components/CalendarWrapper.jsx'));

const CalendarPage = () => {
    return (
        <div className="h-100 w-100">
            <Suspense fallback={<LoadingSpinner />}>
                <CalendarWrapper />
            </Suspense>
        </div>
    );
};

export default CalendarPage;
