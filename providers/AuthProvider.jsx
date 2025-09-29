'use client';

import LoadingPage from '@/components/LoadingPage.jsx';
import NotLoggedIn from '@/components/NotLoggedIn';
import { useSession } from 'next-auth/react';

/**
 * Authentication provider to wrap around components that require authentication.
 * @param {JSX} children
 * @returns 
 */
const AuthProvider = ({ children }) => {
    const sessionObj = useSession();
    if (sessionObj.status === "loading") return <LoadingPage />;
    if (sessionObj.status === "unauthenticated") return <NotLoggedIn />;
    
    return (<>{children}</>);
}

export default AuthProvider;