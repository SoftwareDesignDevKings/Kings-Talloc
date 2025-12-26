'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

// dynamically import CalendarWrapper to reduce initial bundle size
const CalendarWrapper = dynamic(
    () => import('@/components/calendar/CalendarWrapper'),
    {
        ssr: false,
        loading: () => <LoadingSpinner />,
    }
);

const CalendarPage = () => {
    return (
        <CalendarWrapper />
    );
};

export default CalendarPage;
