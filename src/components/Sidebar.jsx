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
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from '@/styles/sidebar.module.css';

const Sidebar = ({ userRole, user }) => {
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const router = useRouter();

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
                            <h4 className={`fs-3 fw-bold ${styles.textIndigo600} mb-0`}>Menu</h4>
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
                        <li
                            className={`${styles.navItem} ${isCollapsed ? styles.navItemCollapsed : styles.navItemExpanded}`}
                            onClick={() => router.push('newDashboard')}
                        >
                            <FiHome className={styles.navIcon} />
                            {!isCollapsed && <span>Dashboard</span>}
                        </li>
                        <li
                            className={`${styles.navItem} ${isCollapsed ? styles.navItemCollapsed : styles.navItemExpanded}`}
                            onClick={() => router.push('calendar')}
                        >
                            <FiCalendar className={styles.navIcon} />
                            {!isCollapsed && <span>Calendar</span>}
                        </li>
                        {userRole === 'teacher' && (
                            <>
                                <li
                                    className={`${styles.navItem} ${isCollapsed ? styles.navItemCollapsed : styles.navItemExpanded}`}
                                    onClick={() => router.push('userRoles')}
                                >
                                    <FiUsers className={styles.navIcon} />
                                    {!isCollapsed && <span>User Roles</span>}
                                </li>
                                <li
                                    className={`${styles.navItem} ${isCollapsed ? styles.navItemCollapsed : styles.navItemExpanded}`}
                                    onClick={() => router.push('classes')}
                                >
                                    <FiBook className={styles.navIcon} />
                                    {!isCollapsed && <span>Manage Classes</span>}
                                </li>
                            </>
                        )}
                        {userRole === 'teacher' && (
                            <li
                                className={`${styles.navItem} ${isCollapsed ? styles.navItemCollapsed : styles.navItemExpanded}`}
                                onClick={() => router.push('subjects')}
                            >
                                <FiBookOpen className={styles.navIcon} />
                                {!isCollapsed && <span>Manage Subjects</span>}
                            </li>
                        )}
                        {userRole !== 'student' && (
                            <li
                                className={`${styles.navItem} ${isCollapsed ? styles.navItemCollapsed : styles.navItemExpanded}`}
                                onClick={() => router.push('tutorHours')}
                            >
                                <FiClock className={styles.navIcon} />
                                {!isCollapsed && <span>Tutor Hours</span>}
                            </li>
                        )}
                    </ul>
                </div>
            </div>
            <div className={styles.profileSection}>
                <div
                    className={`${styles.profileContainer} ${isCollapsed ? styles.profileContainerCollapsed : styles.profileContainerExpanded}`}
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                >
                    {user?.image ? (
                        <Image
                            src={user.image}
                            alt="Profile"
                            width={32}
                            height={32}
                            className={styles.profileImage}
                        />
                    ) : (
                        <div className={styles.profilePlaceholder}>
                            <FiUser className={styles.navIcon} />
                        </div>
                    )}
                    {!isCollapsed && <span>{user.name}</span>}
                    {!isCollapsed && <FiSettings className={styles.navIcon} />}
                </div>
                {showProfileMenu && (
                    <div
                        className={`${styles.profileMenu} ${isCollapsed ? styles.profileMenuCollapsed : styles.profileMenuExpanded}`}
                    >
                        <button
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className={styles.signOutButton}
                        >
                            Sign out
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
