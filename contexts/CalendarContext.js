"use client";

import { createContext, useContext } from 'react';

/**
 * Context for sharing calendar data across components
 */
const CalendarContext = createContext();

export const useCalendarContext = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendarContext must be used within a CalendarProvider');
  }
  return context;
};

export default CalendarContext;