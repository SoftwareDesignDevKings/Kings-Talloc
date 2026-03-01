'use client';

import { createContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import LoadingPage from '@/components/LoadingPage.jsx';
import Login from '@/components/Login.jsx';
import AppLayout from '@/components/AppLayout';
import { syncNextFbAuth, startTokenRefresh, stopTokenRefresh } from '@/auth';

export const AuthContext = createContext();

/**
 * Authentication provider to wrap around components that require authentication.
 * handles both NextAuth session and Firebase authentication sync.
 * automatically refreshes Firebase tokens every 50 minutes to prevent expiration.
 * @param {JSX} children
 * @returns
 */
export const AuthContextProvider = ({ children }) => {
    const { data: session, status, update } = useSession();
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState('student');
    const [userRoles, setUserRoles] = useState([]);

    const [device, setDevice] = useState("desktop")

    const pathname = usePathname();

    // public routes that don't require auth
    const publicRoutes = ['/', '/login', '/maintenance'];
    const isPublicRoute = publicRoutes.includes(pathname);

    // sync Firebase Auth with NextAuth session
    useEffect(() => {
        syncNextFbAuth(session, status).then(({ isLoading, userRole, userRoles }) => {
            setIsLoading(isLoading);
            if (userRoles) setUserRoles(userRoles);

            // use persisted role from sessionStorage, fallback to default
            const persistedRole = sessionStorage.getItem('selectedUserRole');
            if (persistedRole) {
                setUserRole(persistedRole);
            } else {
                setUserRole(userRole)
            }
        });
    }, [status, session]);

    // Auto-refresh Firebase token every 50 minutes
    useEffect(() => {
        if (status === 'authenticated' && !isPublicRoute) {
            startTokenRefresh(update);
            return () => stopTokenRefresh();
        }
    }, [status, isPublicRoute, update]);

    useEffect(() => {
        const handleResize = () => {
            setDevice(window.innerWidth < 768 ? 'mobile' : 'desktop');
        };

        // Set initial device type
        handleResize();

        // Add event listener for window resize
        window.addEventListener('resize', handleResize);

        // Cleanup listener on unmount
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Roles the user can switch between (defaultRole + any secondary roles)
    const availableRoles = useMemo(() => {
        const defaultRole = session?.user?.defaultRole || session?.user?.role;
        return [...new Set([defaultRole, ...userRoles])].filter(Boolean);
    }, [session, userRoles]);

    const switchRole = useCallback((newRole) => {
        if (availableRoles.includes(newRole)) {
            sessionStorage.setItem('selectedUserRole', newRole);
            setUserRole(newRole);
        }
    }, [availableRoles]);

    // memoize context value to prevent unnecessary re-renders
    const authCtxValues = useMemo(() => ({
        session,
        status,
        userRole,
        userRoles,
        availableRoles,
        switchRole,
        loading: isLoading,
        device
    }), [session, status, userRole, isLoading, device, userRoles, availableRoles, switchRole]);

    // Allow public routes to render without auth
    if (isPublicRoute) {
        return (
            <AuthContext.Provider value={authCtxValues}>
                {children}
            </AuthContext.Provider>
        );
    }

    if (isLoading) return <LoadingPage />;
    if (status === 'unauthenticated') return <Login />;

    return (
        <AuthContext.Provider value={authCtxValues}>
            <AppLayout session={session} userRole={userRole}>
                {children}
            </AppLayout>
        </AuthContext.Provider>
    );
};
