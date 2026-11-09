'use client';

import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { usePathname } from 'next/navigation';
import usePrefetchRoutes from '@/hooks/usePrefetchRoutes';
import { currentNavigationItem } from '@/constants/navigation';

/**
 * Main application layout for authenticated users
 * - Desktop: sidebar, page title and user email
 * - Phone (<768px): slim page-name bar on top and a bottom tab bar instead of the sidebar
 * @param {Object} session - NextAuth session object
 * @param {string} userRole - The role of the current user (student, teacher, admin, or tutor)
 * @param {JSX} children - Page content
 */
const AppLayout = ({ session, userRole, children }) => {
    const pathname = usePathname();
    usePrefetchRoutes(userRole);
    let dashboardTitle;
    if (userRole === 'student') {
        dashboardTitle = 'Student dashboard';
    } else if (userRole === 'teacher') {
        dashboardTitle = 'Teacher dashboard';
    } else if (userRole === 'admin') {
        dashboardTitle = 'Admin dashboard';
    } else {
        dashboardTitle = 'Tutor dashboard';
    }
    const navigationItem = currentNavigationItem(pathname);
    const pageTitle = navigationItem?.label || 'Dashboard';
    // Other pages are titled by the page itself rather than the role's dashboard.
    const desktopTitle = !navigationItem || navigationItem.href === '/dashboard' ? dashboardTitle : navigationItem.label;

    return (
        <div className="d-flex app-shell">
            <Sidebar user={session.user} userRole={userRole} />

            {/* main content area */}
            <div className="grow d-flex flex-column overflow-hidden bg-white">
                <header className="mobile-only mobile-page-bar">
                    <h1 className="mobile-page-title">{pageTitle}</h1>
                </header>

                <div className="app-main d-flex flex-column grow overflow-hidden app-content">
                    {/* Header section: responsive alignment */}
                    <div className="text-center text-md-start desktop-only">
                        <h1 className="dashboard-title">{desktopTitle}</h1>
                        <p className="mb-0 text-muted signed-in-text">Signed in as {session.user.email}</p>
                    </div>

                    {/* divider */}
                    <hr className="my-4 divider-offset desktop-only"/>

                    {/* content area with scroll */}
                    <div className={`grow overflow-hidden content-scroll-area${pathname === '/calendar' ? ' calendar-content-area' : ''}`}>
                        <div key={pathname} className="h-100">
                            {children}
                        </div>
                    </div>
                </div>

                <MobileNav user={session.user} userRole={userRole} />
            </div>
        </div>
    );
};

export default AppLayout;
