'use client';

import { createContext, useContext } from 'react';

/**
 * Context for calendar data (events, availabilities, subjects, tutors, etc.)
 * Manages calendar data fetching and state.
 * This context rarely changes - only when events/availabilities are added/updated/deleted.
 */
const CalendarDataContext = createContext(null);

export const useCalendarData = () => {
    const context = useContext(CalendarDataContext);
    if (!context) {
        throw new Error('useCalendarData must be used within CalendarDataProvider');
    }
    return context;
};

export default CalendarDataContext;
