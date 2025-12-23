'use client';

import React, { Suspense, lazy } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

// const CalendarWrapper = lazy(() => import('@/components/CalendarWrapper.jsx'));
const CalendarWrapper = lazy(() => import('@/components/calendar/CalendarWrapper'));

const CalendarPage = () => {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <CalendarWrapper />
        </Suspense>
    );
};

export default CalendarPage;
