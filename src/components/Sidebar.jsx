'use client';

import React, { useState, useEffect } from 'react';
import {
    Calendar, Users01, BookOpen01, Clock, User01, ChevronLeft,
    HomeLine, LogOut01, UserCheck01, Settings01,
} from '@untitledui/icons';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/untitled/button';
import { NavItemBase, SidebarNavigation } from '@/components/untitled/sidebar-navigation';
import styles from '@/styles/sidebar.module.css';
import useAuthSession from '@/hooks/useAuthSession';
import { AppLogout } from '@/lib/security/clientAuth';

const ROLE_LABELS = {
    admin: 'Admin', teacher: 'Teacher', tutor: 'Tutor', coach: 'Coach', student: 'Student',
};
const NAVIGATION_ITEMS = [
    { label: 'Dashboard', href: '/dashboard', icon: HomeLine },
    { label: 'Calendar', href: '/calendar', icon: Calendar },
    { label: 'Tutor Hours', href: '/tutorHours', icon: Clock, roles: ['admin', 'teacher', 'tutor', 'coach'] },
    { label: 'Manage Users', href: '/userRoles', icon: Users01, roles: ['admin'], management: true },
    { label: 'Canvas Classes', href: '/classes', icon: BookOpen01, roles: ['admin', 'teacher'], management: true },
    { label: 'Canvas Admin', href: '/admin/canvas', icon: Settings01, roles: ['admin'], management: true },
];

const Sidebar = ({ user, userRole }) => {
    const { session, userRoles, switchRole } = useAuthSession();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();
    const hasAdminAccess = userRoles?.includes('admin') || session?.user?.defaultRole === 'admin';
    const isCurrentlyAdmin = userRole === 'admin';
    const originalRole = session?.user?.defaultRole;
    const roleLabel = isCurrentlyAdmin ? `View as ${ROLE_LABELS[originalRole] || originalRole}` : 'View as Admin';
    const items = NAVIGATION_ITEMS.filter(item => !item.roles || item.roles.includes(userRole));
    const firstManagementItem = items.find(item => item.management);

    const handleRoleToggle = () => {
        switchRole(isCurrentlyAdmin ? originalRole || 'student' : 'admin');
    };

    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        let lastWidth = null;
        const checkMobile = () => {
            const width = window.innerWidth;
            setIsMobile(width < 768);
            // Height-only resizes (e.g. a phone keyboard opening) keep the chosen state.
            if (width < 768 && width !== lastWidth) setIsCollapsed(true);
            lastWidth = width;
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // On phones the expanded menu overlays the page, so close it after navigating.
    useEffect(() => {
        if (isMobile) setIsCollapsed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    const isOverlay = isMobile && !isCollapsed;
    useEffect(() => {
        if (!isOverlay) return;
        const closeOnEscape = event => { if (event.key === 'Escape') setIsCollapsed(true); };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [isOverlay]);

    return (
        <>
        {isOverlay && <>
            {/* Keeps the collapsed sidebar's space so the page doesn't shift under the overlay. */}
            <div className={styles.overlaySpacer} aria-hidden="true" />
            <div className={styles.overlayScrim} aria-hidden="true" onClick={() => setIsCollapsed(true)} />
        </>}
        <SidebarNavigation
            style={{ '--sidebar-w': isCollapsed ? '5rem' : '16rem' }}
            className={`${styles.sidebarContainer} ${isCollapsed ? styles.sidebarCollapsed : ''} ${isOverlay ? styles.sidebarOverlay : ''}`}
        >
            <div>
                <div className={styles.header}>
                    <h4 className={`${styles.menuTitle} ${styles.navLabel}`}>Menu</h4>
                    <Button
                        size="sm"
                        color="tertiary"
                        iconLeading={ChevronLeft}
                        className={styles.headerToggle}
                        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        onClick={() => setIsCollapsed(collapsed => !collapsed)}
                    />
                </div>
                <nav aria-label="Menu">
                    <ul className={styles.navList}>
                        {items.map(item => (
                            <React.Fragment key={item.href}>
                                {item === firstManagementItem && <li className={styles.navDivider} aria-hidden="true" />}
                                <li>
                                    <NavItemBase
                                        href={item.href}
                                        icon={item.icon}
                                        current={pathname.startsWith(item.href)}
                                        className={styles.navItem}
                                    >{item.label}</NavItemBase>
                                </li>
                            </React.Fragment>
                        ))}
                    </ul>
                </nav>
            </div>
            <div className={styles.profileSection}>
                <div className={styles.profileContainer}>
                    {user?.image ? (
                        <Image src={user.image} alt="Profile" width={32} height={32} className={styles.profileImage} unoptimized />
                    ) : (
                        <div className={styles.profilePlaceholder}>
                            <User01 aria-hidden="true" data-testid="fi-user-icon" />
                        </div>
                    )}
                    <span className={`${styles.userName} ${styles.navLabel}`}>{user.name}</span>
                </div>
                {hasAdminAccess && (
                    <Button size="sm" color="secondary" iconLeading={UserCheck01}
                        onClick={handleRoleToggle} title={roleLabel} aria-label={roleLabel}
                        className={styles.footerButton}>
                        {roleLabel}
                    </Button>
                )}
                <Button size="sm" color="secondary-destructive" iconLeading={LogOut01}
                    onClick={AppLogout} title="Logout" aria-label="Logout" className={styles.footerButton}>
                    Logout
                </Button>
            </div>
        </SidebarNavigation>
        </>
    );
};

export default Sidebar;
