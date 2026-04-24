'use client';

import React, { useState, useEffect } from 'react';
import {
    FiCalendar,
    FiUsers,
    FiBook,
    FiClock,
    FiUser,
    FiChevronLeft,
    FiChevronRight,
    FiBookOpen,
    FiHome,
    FiLogOut,
    FiUserCheck,
} from '@/components/icons';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '@/styles/sidebar.module.css';
import useAuthSession from '@/hooks/useAuthSession';
import { AppLogout } from '@/lib/security/clientAuth';

const ROLE_LABELS = {
    admin: 'Admin',
    teacher: 'Teacher',
    tutor: 'Tutor',
    coach: 'Coach',
    student: 'Student',
};

const Sidebar = ({ user }) => {
    const { session, userRole, userRoles, availableRoles, switchRole } = useAuthSession();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();

    const isAdmin = userRole === 'admin';
    const isAdminOrTeacher = userRole === 'admin' || userRole === 'teacher';
    const isTutorHoursRole = ['admin', 'tutor', 'coach'].includes(userRole);

    const hasAdminAccess = userRoles?.includes('admin') || session?.user?.defaultRole === 'admin';
    const isCurrentlyAdmin = userRole === 'admin';
    const originalRole = session?.user?.defaultRole === 'admin' 
        ? availableRoles.find(r => r !== 'admin') 
        : session?.user?.defaultRole;

    const handleRoleToggle = () => {
        if (isCurrentlyAdmin) {
            switchRole(originalRole || 'student');
        } else {
            switchRole('admin');
        }
    };

    useEffect(() => {
        // Collapse sidebar by default on mobile
        const checkMobile = () => {
            if (window.innerWidth < 768) {
                setIsCollapsed(true);
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const toggleSidebar = () => setIsCollapsed(!isCollapsed);

    return (
        <div
            style={{ '--sidebar-w': isCollapsed ? '5rem' : '16rem' }}
            className={`${styles.sidebarContainer} ${isCollapsed ? styles.sidebarCollapsed : ''} d-flex flex-column justify-content-between`}
        >
            <div>
                <div className="p-4">
                    <div className={`d-flex align-items-center ${isCollapsed ? 'justify-content-center' : 'justify-content-between'}`}>
                        <h4 className={`fs-3 fw-bold mb-0 ${styles.menuTitle} ${styles.navLabel}`}>
                            Menu
                        </h4>
                        <button
                            onClick={toggleSidebar}
                            className={styles.toggleButton}
                            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {isCollapsed ? (
                                <FiChevronRight size={24} />
                            ) : (
                                <FiChevronLeft size={24} />
                            )}
                        </button>
                    </div>
                </div>
                <div className="grow">
                    <ul className={styles.navList}>
                        <li className={styles.navItem}>
                            <Link
                                href="/dashboard"
                                className={`${styles.navLink} ${isCollapsed ? styles.navLinkCollapsed : styles.navLinkExpanded} ${pathname.startsWith('/dashboard') ? styles.activeNavLink : ''}`}
                            >
                                <FiHome className={styles.navIcon} />
                                <span className={styles.navLabel}>Dashboard</span>
                            </Link>
                        </li>
                        <li className={styles.navItem}>
                            <Link
                                href="/calendar"
                                className={`${styles.navLink} ${isCollapsed ? styles.navLinkCollapsed : styles.navLinkExpanded} ${pathname.startsWith('/calendar') ? styles.activeNavLink : ''}`}
                            >
                                <FiCalendar className={styles.navIcon} />
                                <span className={styles.navLabel}>Calendar</span>
                            </Link>
                        </li>
                        {isAdmin && (
                            <li className={styles.navItem}>
                                <Link
                                    href="/userRoles"
                                    className={`${styles.navLink} ${isCollapsed ? styles.navLinkCollapsed : styles.navLinkExpanded} ${pathname.startsWith('/userRoles') ? styles.activeNavLink : ''}`}
                                >
                                    <FiUsers className={styles.navIcon} />
                                    <span className={styles.navLabel}>User Roles</span>
                                </Link>
                            </li>
                        )}
                        {isAdminOrTeacher && (
                            <>
                                <li className={styles.navItem}>
                                    <Link
                                        href="/classes"
                                        className={`${styles.navLink} ${isCollapsed ? styles.navLinkCollapsed : styles.navLinkExpanded} ${pathname.startsWith('/classes') ? styles.activeNavLink : ''}`}
                                    >
                                        <FiBook className={styles.navIcon} />
                                        <span className={styles.navLabel}>Manage Classes</span>
                                    </Link>
                                </li>
                                <li className={styles.navItem}>
                                    <Link
                                        href="/subjects"
                                        className={`${styles.navLink} ${isCollapsed ? styles.navLinkCollapsed : styles.navLinkExpanded} ${pathname.startsWith('/subjects') ? styles.activeNavLink : ''}`}
                                    >
                                        <FiBookOpen className={styles.navIcon} />
                                        <span className={styles.navLabel}>Manage Subjects</span>
                                    </Link>
                                </li>
                            </>
                        )}
                        {isTutorHoursRole && (
                            <li className={styles.navItem}>
                                <Link
                                    href="/tutorHours"
                                    className={`${styles.navLink} ${isCollapsed ? styles.navLinkCollapsed : styles.navLinkExpanded} ${pathname.startsWith('/tutorHours') ? styles.activeNavLink : ''}`}
                                >
                                    <FiClock className={styles.navIcon} />
                                    <span className={styles.navLabel}>Tutor Hours</span>
                                </Link>
                            </li>
                        )}
                    </ul>
                </div>
            </div>
            <div className={styles.profileSection}>
                <div
                    className={`${styles.profileContainer} ${isCollapsed ? styles.profileContainerCollapsed : styles.profileContainerExpanded}`}
                >
                    {user?.image ? (
                        <Image
                            src={user.image}
                            alt="Profile"
                            width={32}
                            height={32}
                            className={styles.profileImage}
                            unoptimized
                        />
                    ) : (
                        <div className={styles.profilePlaceholder}>
                            <FiUser className={styles.navIcon} data-testid="fi-user-icon" />
                        </div>
                    )}
                    <span className={`${styles.navLabel} fw-semibold text-truncate`}>{user.name}</span>
                </div>
                
                {hasAdminAccess && (
                    <button
                        onClick={handleRoleToggle}
                        className={`btn btn-outline-secondary d-flex align-items-center ${styles.logoutButton} ${isCollapsed ? styles.logoutButtonCollapsed : styles.logoutButtonExpanded}`}
                        style={{ borderStyle: 'dashed' }}
                        title={isCurrentlyAdmin ? `Switch to ${ROLE_LABELS[originalRole] || originalRole}` : "Switch to Admin"}
                    >
                        <FiUserCheck className={styles.logoutIcon} />
                        <span className={styles.navLabel}>
                            {isCurrentlyAdmin ? `Back to ${ROLE_LABELS[originalRole] || originalRole}` : 'Admin View'}
                        </span>
                    </button>
                )}

                <button
                    onClick={AppLogout}
                    className={`btn btn-outline-danger d-flex align-items-center ${styles.logoutButton} ${isCollapsed ? styles.logoutButtonCollapsed : styles.logoutButtonExpanded}`}
                    title="Logout"
                >
                    <FiLogOut className={styles.logoutIcon} />
                    <span className={styles.navLabel}>Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
