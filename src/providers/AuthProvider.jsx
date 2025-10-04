'use client';

import LoadingPage from '@/components/LoadingPage.jsx';
import LoginPage from '@/components/LoginPage.jsx';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react'

/**
 * Authentication provider to wrap around components that require authentication.
 * @param {JSX} children
 * @returns 
 */
const AuthProvider = ({ children }) => {
    const sessionObj = useSession();
    const [isLoading, setIsLoading] = useState(true);    

    useEffect(() => {
        if (sessionObj.status === "loading") {
            setIsLoading(false)
        }

    }, [sessionObj.status])

    if (isLoading) return <LoadingPage />;
    if (sessionObj.status === "unauthenticated") return <LoginPage />;

    return (<>{children}</>);
}

export default AuthProvider;