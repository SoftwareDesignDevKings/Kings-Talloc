import { Inter } from 'next/font/google';
import './globals.css';
import { AppSessionContextProvider } from '@/contexts/AppSessionContext';
import { AppDataContextProvider } from '@/contexts/AppDataContext';
import Script from 'next/script';
import { Suspense } from 'react';
import LoadingPage from '@/components/LoadingPage';
import VersionGuard from '@/components/VersionGuard';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
    title: 'Kings-Talloc',
    description: 'TKS Computing Studies - Tutor Allocation App',
};

export default function RootLayout({ children }) {

    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link
                    rel="stylesheet"
                    href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css"
                />
                <link
                    rel="stylesheet"
                    href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
                />
            </head>
            <body className={inter.className} suppressHydrationWarning>
                {/* force version update */}
                <VersionGuard />
        
                <AppSessionContextProvider>
                    <AppDataContextProvider>
                        <Suspense fallback={<LoadingPage />}>
                            {children}
                        </Suspense>
                    </AppDataContextProvider>
                </AppSessionContextProvider>
                <Script
                    src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"
                    strategy="afterInteractive"
                />
            </body>
        </html>
    );
}
