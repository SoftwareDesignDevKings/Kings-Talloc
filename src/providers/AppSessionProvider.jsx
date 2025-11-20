'use client';

import { SessionProvider } from 'next-auth/react';
import AlertProvider from './AlertProvider';
import AuthProvider from './AuthProvider';

/**
 * App session provider - called in app/layout.jsx to wrap around the app and provide session context.
 * - useSession must be wrapped inside Next-Auth's SessionProvider.
 * - wraps notifications and auth providers.
 * @param {JSX} children
 * @returns
 */
const AppSessionProvider = ({ children }) => {
    return (
        <SessionProvider>
            <AuthProvider>
                <AlertProvider>{children}</AlertProvider>
            </AuthProvider>
        </SessionProvider>
    );
};

export default AppSessionProvider;
