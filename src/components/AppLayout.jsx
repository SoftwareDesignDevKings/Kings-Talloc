'use client';

import Sidebar from '@/components/Sidebar';
import { usePathname } from 'next/navigation';
import usePrefetchRoutes from '@/hooks/usePrefetchRoutes';

/**
 * Main application layout for authenticated users
 * - Gradient background with sidebar and white card container
 * - Dashboard title and user email display
 * @param {Object} session - NextAuth session object
 * @param {string} 
 * @param {JSX} children - Page content
 */
const AppLayout = ({ session, userRole, children }) => {
    const pathname = usePathname();
    usePrefetchRoutes(userRole);
    let dashboardTitle;
    if (userRole === 'student') {
        dashboardTitle = 'Student Dashboard';
    } else if (userRole === 'teacher') {
        dashboardTitle = 'Teacher Dashboard';
    } else if (userRole === 'admin') {
        dashboardTitle = 'Admin Dashboard';    
    } else {
        dashboardTitle = 'Tutor Dashboard';
    }

    return (
        <div className="d-flex app-shell">
            <Sidebar user={session.user} userRole={userRole} />

            {/* main content area */}
            <div className="grow d-flex flex-column overflow-hidden bg-white">
                <div className="p-4 p-md-4 d-flex flex-column grow overflow-hidden">
                    {/* Header section: responsive alignment */}
                    <div className="ps-1 text-center text-md-start ps-1">
                        <h1 className="dashboard-title ps-1 mt-2">{dashboardTitle}</h1>
                        <p className="ps-1 mb-0 text-muted signed-in-text">Signed in as {session.user.email}</p>
                    </div>

                    {/* divider */}
                    <hr className="my-4 divider-offset"/>

                    {/* content area with scroll */}
                    <div className="grow overflow-hidden content-scroll-area">
                        <div key={pathname} className="fade-in h-100">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppLayout;
