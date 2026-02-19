'use client';

import { createContext, useContext } from 'react';

/**
 * Context for global app data (events, availabilities, subjects, tutors, etc.)
 * Manages data fetching and state.
 * This context rarely changes - only when events/availabilities are added/updated/deleted.
 */
const AppDataContext = createContext(null);

export const useAppData = () => {
    const context = useContext(AppDataContext);
    if (!context) {
        throw new Error('useAppData must be used within AppDataProvider');
    }
    return context;
};

export default AppDataContext;
