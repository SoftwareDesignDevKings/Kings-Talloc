import React from 'react';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';

let mockSessionState;
const mockMounts = jest.fn();
jest.mock('next-auth/react', () => ({ useSession: () => mockSessionState }));
jest.mock('next/navigation', () => ({ usePathname: () => '/calendar' }));
jest.mock('@/lib/security/clientAuth', () => ({
    syncNextFbAuth: jest.fn(async (session, status) => (status === 'authenticated'
        ? { isLoading: false, userRole: 'teacher', userRoles: [] }
        : { isLoading: true })),
    startTokenRefresh: jest.fn(),
    stopTokenRefresh: jest.fn(),
}));
jest.mock('@/components/LoadingPage.jsx', () => () => <p>Loading page</p>);
jest.mock('@/components/Login.jsx', () => () => <p>Login page</p>);
jest.mock('@/components/AppLayout', () => ({ children }) => <main>{children}</main>);
jest.mock('@/contexts/RequestNotificationsContext', () => ({ RequestNotificationsProvider: ({ children }) => children }));
jest.mock('@/contexts/AppDataContext', () => {
    const { useEffect } = require('react');
    return { AppDataContextProvider: ({ children }) => { useEffect(() => { mockMounts(); }, []); return children; } };
});

const { AuthContextProvider } = require('@/contexts/AuthContext');
const session = { user: { email: 'teacher@school.test', defaultRole: 'teacher' } };

afterEach(cleanup);

test('the periodic session refresh keeps the app (and its data listeners) mounted', async () => {
    mockSessionState = { data: session, status: 'authenticated', update: jest.fn() };
    const { rerender } = render(<AuthContextProvider><p>Calendar</p></AuthContextProvider>);
    await waitFor(() => expect(screen.getByText('Calendar')).toBeInTheDocument());
    expect(mockMounts).toHaveBeenCalledTimes(1);

    // next-auth's update() reports 'loading' while it refetches the same session.
    mockSessionState = { data: session, status: 'loading', update: jest.fn() };
    rerender(<AuthContextProvider><p>Calendar</p></AuthContextProvider>);
    await act(async () => {});
    expect(screen.queryByText('Loading page')).not.toBeInTheDocument();
    mockSessionState = { data: { ...session }, status: 'authenticated', update: jest.fn() };
    rerender(<AuthContextProvider><p>Calendar</p></AuthContextProvider>);

    await waitFor(() => expect(screen.getByText('Calendar')).toBeInTheDocument());
    expect(screen.queryByText('Loading page')).not.toBeInTheDocument();
    expect(mockMounts).toHaveBeenCalledTimes(1);
});
