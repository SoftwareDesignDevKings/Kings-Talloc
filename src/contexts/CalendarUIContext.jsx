'use client';

import { createContext, useContext } from 'react';

/**
 * Context for calendar UI state (filters, visibility toggles, etc.)
 * Manages UI state that changes frequently.
 * Separated from data context to prevent unnecessary re-fetching.
 */
const CalendarUIContext = createContext(null);

export const useCalendarUI = () => {
    const context = useContext(CalendarUIContext);
    if (!context) {
        throw new Error('useCalendarUI must be used within CalendarUIProvider');
    }
    return context;
};

export default CalendarUIContext;
