'use client';

import Sidebar from '@/components/Sidebar';
import { usePathname } from 'next/navigation';
import usePrefetchRoutes from '@/hooks/usePrefetchRoutes';

/**
 * Main application layout for authenticated users
 * - Gradient background with sidebar and white card container
 * - Dashboard title and user email display
 * @param {Object} session - NextAuth session object
 * @param {string} userRole - The role of the current user (student, teacher, admin, or tutor)
 * @param {JSX} children - Page content
 */
const PAGE_TITLES = {
    '/calendar': 'Calendar',
    '/tutorHours': 'Tutor Hours',
    '/userRoles': 'Manage Users',
    '/classes': 'Canvas Classes',
    '/admin/canvas': 'Canvas Admin',
};

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
    // Other pages are titled by the page itself rather than the role's dashboard.
    const pageTitle = Object.entries(PAGE_TITLES).find(([route]) => pathname.startsWith(route))?.[1] || dashboardTitle;

    return (
        <div className="d-flex app-shell">
            <Sidebar user={session.user} userRole={userRole} />

            {/* main content area */}
            <div className="grow d-flex flex-column overflow-hidden bg-white">
                <div className="app-main d-flex flex-column grow overflow-hidden">
                    {/* Header section: responsive alignment */}
                    <div className="ps-1 text-center text-md-start">
                        <h1 className="dashboard-title ps-1">{pageTitle}</h1>
                        <p className="ps-1 mb-0 text-muted signed-in-text">Signed in as {session.user.email}</p>
                    </div>

                    {/* divider */}
                    <hr className="my-4 divider-offset"/>

                    {/* content area with scroll */}
                    <div className={`grow overflow-hidden content-scroll-area${pathname === '/calendar' ? ' calendar-content-area' : ''}`}>
                        <div key={pathname} className="h-100">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppLayout;
