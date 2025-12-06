'use client';

import React, { Suspense, lazy } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

const CalendarWrapper = lazy(() => import('@/components/CalendarWrapper.jsx'));

const CalendarPage = () => {
    // return (
    //     <Suspense fallback={<LoadingSpinner />}>
    //         <CalendarWrapper />
    //     </Suspense>
    // );
    return (
        <CalendarWrapper />
    );
};

export default CalendarPage;
