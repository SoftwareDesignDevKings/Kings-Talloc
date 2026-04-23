'use client';

import React, { useState, useEffect } from 'react';
import {
    FiCalendar,
    FiUsers,
    FiBook,
    FiClock,
    FiUser,
    FiSettings,
    FiChevronLeft,
    FiChevronRight,
    FiBookOpen,
    FiHome,
} from '@/components/icons';
import Image from 'next/image';
import Link from 'next/link';
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
    const { userRole, availableRoles, switchRole } = useAuthSession();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const isAdmin = userRole === 'admin';
    const isAdminOrTeacher = userRole === 'admin' || userRole === 'teacher';

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
            className={`${styles.sidebarContainer} ${isCollapsed ? styles.sidebarCollapsed : styles.sidebarExpanded} d-flex flex-column justify-content-between`}
        >
            <div>
                <div className="p-4">
                    <div className="d-flex justify-content-between align-items-center">
                        {!isCollapsed && (
                            <h4 className={`fs-3 fw-bold mb-0 ${styles.menuTitle}`}>
                                Menu
                            </h4>
                        )}
                        <button onClick={toggleSidebar} className={styles.toggleButton}>
                            {isCollapsed ? (
                                <FiChevronRight size={24} />
                            ) : (
                                <FiChevronLeft size={24} />
                            )}
                        </button>
                    </div>
                </div>
                <div className="flex-grow-1">
                    <ul className={styles.navList}>
                        <li className={`${styles.navItem} ${isCollapsed ? styles.navItemCollapsed : styles.navItemExpanded}`}>
                            <Link href="/dashboard" className={styles.navLink}>
                                <FiHome className={styles.navIcon} />
                                {!isCollapsed && <span>Dashboard</span>}
                            </Link>
                        </li>
                        <li className={`${styles.navItem} ${isCollapsed ? styles.navItemCollapsed : styles.navItemExpanded}`}>
                            <Link href="/calendar" className={styles.navLink}>
                                <FiCalendar className={styles.navIcon} />
                                {!isCollapsed && <span>Calendar</span>}
                            </Link>
                        </li>
                        {isAdmin && (
                            <li className={`${styles.navItem} ${isCollapsed ? styles.navItemCollapsed : styles.navItemExpanded}`}>
                                <Link href="/userRoles" className={styles.navLink}>
                                    <FiUsers className={styles.navIcon} />
                                    {!isCollapsed && <span>User Roles</span>}
                                </Link>
                            </li>
                        )}
                        {isAdminOrTeacher && (
                            <>
                                <li className={`${styles.navItem} ${isCollapsed ? styles.navItemCollapsed : styles.navItemExpanded}`}>
                                    <Link href="/classes" className={styles.navLink}>
                                        <FiBook className={styles.navIcon} />
                                        {!isCollapsed && <span>Manage Classes</span>}
                                    </Link>
                                </li>
                                <li className={`${styles.navItem} ${isCollapsed ? styles.navItemCollapsed : styles.navItemExpanded}`}>
                                    <Link href="/subjects" className={styles.navLink}>
                                        <FiBookOpen className={styles.navIcon} />
                                        {!isCollapsed && <span>Manage Subjects</span>}
                                    </Link>
                                </li>
                            </>
                        )}
                        {['admin', 'tutor', 'coach'].includes(userRole) && (
                            <li className={`${styles.navItem} ${isCollapsed ? styles.navItemCollapsed : styles.navItemExpanded}`}>
                                <Link href="/tutorHours" className={styles.navLink}>
                                    <FiClock className={styles.navIcon} />
                                    {!isCollapsed && <span>Tutor Hours</span>}
                                </Link>
                            </li>
                        )}
                    </ul>
                </div>
            </div>
            <div className={`${styles.profileSection} dropdown dropup`}>
                <div
                    className={`${styles.profileContainer} ${isCollapsed ? styles.profileContainerCollapsed : styles.profileContainerExpanded}`}
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    data-bs-toggle="dropdown"
                    aria-expanded={showProfileMenu}
                    role="button"
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
                    {!isCollapsed && <span>{user.name}</span>}
                    {!isCollapsed && <FiSettings className={styles.navIcon} />}
                </div>
                <div
                    className={`${styles.profileMenu} ${isCollapsed ? styles.profileMenuCollapsed : styles.profileMenuExpanded} dropdown-menu${showProfileMenu ? ' show' : ''}`}
                >
                    {availableRoles.length > 1 && (
                        <div className="d-flex gap-1 flex-wrap mb-2 px-3 pt-3">
                            {availableRoles.map((role) => (
                                <button
                                    key={role}
                                    onClick={() => switchRole(role)}
                                    className={`btn btn-sm ${userRole === role ? 'btn-primary' : 'btn-outline-secondary'}`}
                                >
                                    {ROLE_LABELS[role] || role}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="px-3 pb-3">
                        <button
                            onClick={AppLogout}
                            className="btn btn-danger w-100"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
