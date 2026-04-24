'use client';

import { SessionProvider } from 'next-auth/react';
import { AlertContextProvider } from './AlertContext';
import { AuthContextProvider } from './AuthContext';

/**
 * App session provider - called in app/layout.jsx to wrap around the app and provide session context.
 * - useSession must be wrapped inside Next-Auth's SessionProvider.
 * - wraps notifications and auth providers.
 * @param {JSX} children
 * @returns
 */
export const AppSessionContextProvider = ({ children }) => {
    return (
        <SessionProvider>
            <AuthContextProvider>
                <AlertContextProvider>{children}</AlertContextProvider>
            </AuthContextProvider>
        </SessionProvider>
    );
};
