'use client';

import LoadingPage from '@/components/LoadingPage.jsx';
import LoginPage from '@/components/LoginPage.jsx';
import { useSession } from 'next-auth/react';
import { useEffect, useState, Suspense } from 'react';
import { signInWithCustomToken, signOut } from "firebase/auth";
import { auth } from "@/firestore/clientFirestore";
import { usePathname } from 'next/navigation';
import AuthContext from '@/contexts/AuthContext';

/**
 * Authentication provider to wrap around components that require authentication.
 * Handles both NextAuth session and Firebase authentication sync.
 * @param {JSX} children
 * @returns
 */
const AuthProvider = ({ children }) => {
    const { data: session, status } = useSession();
    const [isLoading, setIsLoading] = useState(true);
    const [userRole, setUserRole] = useState("student");
    const pathname = usePathname();

    // Public routes that don't require auth
    const publicRoutes = ['/', '/login'];
    const isPublicRoute = publicRoutes.includes(pathname);

    useEffect(() => {
        const syncAuth = async () => {
            try {
                if (status === "authenticated" && session?.user) {
                    setUserRole(session.user.role);
                    await signInWithCustomToken(auth, session.user.firebaseToken);
                    setIsLoading(false);
                }

                if (status === "unauthenticated") {
                    await signOut(auth).catch(() => {});
                    setIsLoading(false);
                }
            } catch (err) {
                console.log("Error in syncing auth: ", err);
                setIsLoading(false);
            }
        };

        syncAuth();
    }, [status, session]);

    // Allow public routes to render without auth
    if (isPublicRoute) {
        return (
            <AuthContext.Provider value={{ session, status, userRole, loading: isLoading }}>
                {children}
            </AuthContext.Provider>
        );
    }

    if (isLoading) return <LoadingPage />;
    if (status === "unauthenticated") return <LoginPage />;

    return (
        <AuthContext.Provider value={{ session, status, userRole, loading: isLoading }}>
            <Suspense fallback={
                <div className="tw-flex tw-items-center tw-justify-center tw-h-screen tw-w-screen">
                    <div className="tw-flex tw-flex-col tw-items-center tw-gap-4">
                        <div className="tw-relative tw-w-16 tw-h-16">
                            <div className="tw-absolute tw-inset-0 tw-border-4 tw-border-purple-200 tw-rounded-full"></div>
                            <div className="tw-absolute tw-inset-0 tw-border-4 tw-border-transparent tw-border-t-purple-600 tw-rounded-full tw-animate-spin"></div>
                        </div>
                        <div className="tw-text-gray-700 tw-text-base tw-font-medium">Loading...</div>
                    </div>
                </div>
            }>
                {children}
            </Suspense>
        </AuthContext.Provider>
    );
}

export default AuthProvider;