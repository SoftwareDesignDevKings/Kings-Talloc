import React, { useEffect } from 'react';
import { render, act, cleanup } from '@testing-library/react';

const mockUnsubscribe = jest.fn();
jest.mock('@/firestore/firestoreFetch', () => ({
    firestoreFetchOneOffShifts: jest.fn(() => mockUnsubscribe),
    firestoreFetchRecurringShifts: jest.fn(() => mockUnsubscribe),
    firestoreFetchAvailabilities: jest.fn(() => mockUnsubscribe),
    firestoreFetchStudentRequests: jest.fn(() => mockUnsubscribe),
    fetchCacheTutors: jest.fn(async () => []),
    fetchCacheClasses: jest.fn(async () => []),
    fetchCacheSubjects: jest.fn(async () => []),
    fetchCacheStudents: jest.fn(async () => []),
    fetchStudentTutorEligibility: jest.fn(async () => ({})),
}));
jest.mock('@/hooks/useAuthSession', () => () => ({ session: { user: { email: 'teacher@school.test' } }, userRole: 'teacher' }));
jest.mock('@/hooks/useCalendarStrategy', () => () => ({
    firestoreConstraints: { shifts: () => [], availabilities: () => [], studentRequests: () => [] },
}));
jest.mock('@/hooks/useBookableAvailability', () => () => ({ slots: [], ready: false, error: null }));

const fetchers = require('@/firestore/firestoreFetch');
const { AppDataContextProvider, useAppData } = require('@/contexts/AppDataContext');

const listenerCalls = () => fetchers.firestoreFetchRecurringShifts.mock.calls.length
    + fetchers.firestoreFetchOneOffShifts.mock.calls.length
    + fetchers.firestoreFetchAvailabilities.mock.calls.length
    + fetchers.firestoreFetchStudentRequests.mock.calls.length;
const Watcher = ({ range }) => {
    const { watchCalendarData } = useAppData();
    useEffect(() => { watchCalendarData(range); }, [watchCalendarData, range]);
    return null;
};

beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers(); });
afterEach(() => { cleanup(); jest.useRealTimers(); });

test('pages that do not show calendar data attach no listeners', async () => {
    render(<AppDataContextProvider><div /></AppDataContextProvider>);
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(listenerCalls()).toBe(0);
    expect(fetchers.fetchCacheTutors).toHaveBeenCalled();
});

test('a calendar view subscribes once with its own range and keeps listeners across views', async () => {
    const range = { start: new Date('2027-04-05T00:00:00'), end: new Date('2027-04-18T23:59:59') };
    const { rerender } = render(<AppDataContextProvider><Watcher range={range} /></AppDataContextProvider>);
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(fetchers.firestoreFetchOneOffShifts).toHaveBeenCalledTimes(1);
    expect(fetchers.firestoreFetchOneOffShifts.mock.calls[0][1]).toEqual(range);
    expect(fetchers.firestoreFetchRecurringShifts).toHaveBeenCalledTimes(1);

    // Navigating to a page without calendar data keeps the existing subscriptions.
    rerender(<AppDataContextProvider><div /></AppDataContextProvider>);
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(mockUnsubscribe).not.toHaveBeenCalled();
    expect(listenerCalls()).toBe(4);
});
