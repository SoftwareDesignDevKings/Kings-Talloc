'use client';

import { SessionProvider } from 'next-auth/react';

const AppSessionProvider = ({ children }) => {
    return (
        <SessionProvider>
            {children}
        </SessionProvider>
    );
};

export default AppSessionProvider;