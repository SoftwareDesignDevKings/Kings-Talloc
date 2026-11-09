'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import PageLoading from '@/components/PageLoading.jsx';

// dynamically import CalendarWrapper to reduce initial bundle size
const CalendarWrapper = dynamic(
    () => import('@/components/calendar/CalendarWrapper'),
    {
        ssr: false,
        loading: () => <PageLoading />,
    }
);

const CalendarPage = () => {
    return (
        <CalendarWrapper />
    );
};

export default CalendarPage;
