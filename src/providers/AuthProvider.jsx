'use client';

import LoadingPage from '@/components/LoadingPage.jsx';
import Login from '@/components/Login.jsx';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import { signInWithCustomToken, signOut } from 'firebase/auth';
import { auth } from '@/firestore/firestoreClient';
import { usePathname } from 'next/navigation';
import AuthContext from '@/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';

/**
 * Authentication provider to wrap around components that require authentication.
 * Handles both NextAuth session and Firebase authentication sync.
 * Automatically refreshes Firebase tokens every 50 minutes to prevent expiration.
 * @param {JSX} children
 * @returns
 */
const AuthProvider = ({ children }) => {
    const { data: session, status, update } = useSession();
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState('student');
    const [device, setDevice] = useState("desktop")

    const pathname = usePathname();
    const tokenRefreshInterval = useRef(null);

    // Public routes that don't require auth
    const publicRoutes = ['/', '/login'];
    const isPublicRoute = publicRoutes.includes(pathname);

    // Sync Firebase Auth with NextAuth session
    useEffect(() => {
        const syncAuth = async () => {
            try {
                if (status === 'authenticated' && session.user) {
                    setUserRole(session.user.role);

                    // signin AND force token refresh so custom claims are updated
                    await signInWithCustomToken(auth, session.user.firebaseToken);

                    // firebaseToken has claims (role, email) set in authOptions.js, but never fully refreshed on client side 
                    // force refresh to ensure claims are applied in every firebase request
                    await auth.currentUser.getIdToken(true);
                    // getAuth().currentUser.getIdToken(true).then(t => console.log(t))
                    
                    setIsLoading(false);
                }

                if (status === 'unauthenticated') {
                    await signOut(auth).catch(() => {});
                    setIsLoading(false);
                }
            } catch (err) {
                console.log('Error in syncing auth: ', err);
                setIsLoading(false);
            }
        };

        syncAuth();
    }, [status, session]);

    // Auto-refresh Firebase token every 50 minutes
    useEffect(() => {
        if (status === 'authenticated' && !isPublicRoute) {
            if (tokenRefreshInterval.current) {
                clearInterval(tokenRefreshInterval.current);
            }

            // refresh interval (50 minutes)
            const FIFTY_MINUTES = 50 * 60 * 1000;
            tokenRefreshInterval.current = setInterval(async () => {
                try {
                    const updatedSession = await update();
                    if (updatedSession?.user?.firebaseToken) {
                        await signInWithCustomToken(auth, updatedSession.user.firebaseToken);
                        await auth.currentUser.getIdToken(true);

                    }
                } catch (error) {
                    console.error('Error refreshing Firebase token:', error);
                }
            }, FIFTY_MINUTES);

            // Cleanup interval on unmount
            return () => {
                if (tokenRefreshInterval.current) {
                    clearInterval(tokenRefreshInterval.current);
                }
            };
        }
    }, [status, isPublicRoute, update]);

    useEffect(() => {
        setDevice(window.innerWidth < 768 ? 'mobile' : 'desktop');
    }, []);

    const authCtxValues = {
        session, 
        status, 
        userRole, 
        loading: isLoading,
        device
    }

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

export default AuthProvider;
