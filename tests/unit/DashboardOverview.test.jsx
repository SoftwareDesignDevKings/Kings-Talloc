import React from 'react';
import { render, screen, within } from '@testing-library/react';
import DashboardOverview from '@/components/DashboardOverview';
import DashboardTutorStats from '@/components/dashboard/DashboardTutorStats';
import DashboardStudentStats from '@/components/dashboard/DashboardStudentStats';

let mockShifts = [];
const mockSetRange = jest.fn();
jest.mock('@/hooks/useAuthSession', () => () => ({ session: { user: { email: 'tutor@school.test' } }, userRole: 'tutor', userRoles: ['tutor'] }));
jest.mock('@/hooks/useAlert', () => () => ({ addAlert: jest.fn() }));
jest.mock('@/contexts/AppDataContext', () => ({ useAppData: () => ({ calendarShifts: mockShifts, calendarStudentRequests: [], calendarAvailabilities: [], setCalendarDateRange: mockSetRange }) }));
jest.mock('@/firestore/firestoreFetch', () => ({ fetchCacheClasses: jest.fn() }));
jest.mock('@/components/dashboard/DashboardStatsCards.jsx', () => function MockStats({ data }) { return <div data-testid="stats">{JSON.stringify(data)}</div>; });
jest.mock('@/components/dashboard/BookingNotices', () => () => null);
jest.mock('@/components/modals/WelcomeModal.jsx', () => () => null);
jest.mock('@/components/modals/ReLoginModal.jsx', () => () => null);

beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-16T01:00:00Z'));
    mockShifts = [];
    mockSetRange.mockClear();
});
afterEach(() => jest.useRealTimers());

test('counts more than five upcoming sessions but previews only the earliest five, including unordered ISO dates', () => {
    const session = hour => ({ id: `session-${hour}`, title: `Session ${hour}`, workType: 'work', staff: [{ value: 'tutor@school.test' }], start: `2026-10-19T${hour}:00:00Z`, end: `2026-10-19T${hour}:30:00Z` });
    mockShifts = ['08', '07', '06', '05', '04', '03', '02'].map(session);
    mockShifts.push({ ...session('01'), id: 'past', title: 'Past session', start: '2026-10-15T01:00:00Z', end: '2026-10-15T01:30:00Z' });
    render(<DashboardOverview />);
    const stats = JSON.parse(screen.getByTestId('stats').textContent);
    expect(stats.upcomingEventsCount).toBe(7);
    expect(stats.upcomingEvents.map(event => event.id)).toEqual(['session-02', 'session-03', 'session-04', 'session-05', 'session-06']);
    expect(stats.upcomingPeriod).toBe('Through 25/10/2026');
    expect(screen.getByText('5 of 7')).toBeInTheDocument();
    expect(screen.queryByText('Session 07')).not.toBeInTheDocument();
    expect(screen.queryByText('Past session')).not.toBeInTheDocument();
});

test('empty schedules give zero upcoming sessions and no preview rows', () => {
    render(<DashboardOverview />);
    expect(JSON.parse(screen.getByTestId('stats').textContent).upcomingEventsCount).toBe(0);
    expect(screen.getByText('No upcoming events scheduled')).toBeInTheDocument();
});

test.each([DashboardTutorStats, DashboardStudentStats])('labels allocated hours as scheduled, with their period', Component => {
    const data = { upcomingEventsCount: 7, upcomingPeriod: 'Through 25/10/2026', weeklyHours: { work: 3.5, coaching: 2 }, uncompletedShifts: 0, uniqueStudents: 0, pendingRequests: 0, approvedRequests: 0 };
    render(<Component data={data} />);
    const card = screen.getByRole('heading', { name: 'Scheduled Hours' }).closest('[data-untitled-table-card]');
    expect(within(card).getByRole('heading', { level: 3 })).toHaveTextContent('5h 30m');
    expect(within(card).getByText(/This week/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Total Hours' })).not.toBeInTheDocument();
    expect(screen.getByText('Through 25/10/2026')).toBeInTheDocument();
});
