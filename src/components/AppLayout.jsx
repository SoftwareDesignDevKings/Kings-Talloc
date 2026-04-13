'use client';

import Sidebar from '@/components/Sidebar';
import { usePathname } from 'next/navigation';

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
        <div className="d-flex min-vh-100 app-gradient-bg">
            <Sidebar user={session.user} userRole={userRole} />

            {/* main content area with outer padding */}
            <div className="flex-grow-1 p-1 p-md-3 d-flex flex-column overflow-hidden">
                {/* white card container */}
                <div className="bg-white rounded-3 shadow-lg p-4 p-md-4 d-flex flex-column flex-grow-1 overflow-hidden">
                    {/* Header section: responsive alignment */}
                    <div className="ps-1 text-center text-md-start ps-1">
                        <h1 className="dashboard-title ps-1 mt-2">{dashboardTitle}</h1>
                        <p className="ps-1  mb-0 text-muted signed-in-text">Signed in as {session.user.email}</p>
                    </div>

                    {/* divider */}
                    <hr className="my-4 divider-offset"/>

                    {/* content area with scroll */}
                    <div className="flex-grow-1 overflow-hidden content-scroll-area">
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
