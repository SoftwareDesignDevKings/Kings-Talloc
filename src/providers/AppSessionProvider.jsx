'use client';

import { SessionProvider } from 'next-auth/react';
import AuthProvider from './AuthProvider';

/**
 * App session provider to wrap around the app and provide session context.
 * useSession must be wrapped inside Next-Auth's SessionProvider.
 * @param {JSX} children
 * @returns
 */
const AppSessionProvider = ({ children }) => {
    return (
        <SessionProvider>
            <AuthProvider>
                {children}
            </AuthProvider>
        </SessionProvider>
    );
};

export default AppSessionProvider;