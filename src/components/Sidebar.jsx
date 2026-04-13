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
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import styles from '@/styles/sidebar.module.css';

const Sidebar = ({ userRole, user }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const pathname = usePathname();

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
                    <div className="d-flex justify-content-between align-items-center">
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
                <div className="flex-grow-1">
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
                        {(userRole === 'teacher' || userRole === 'admin') && (
                            <>
                                <li className={styles.navItem}>
                                    <Link
                                        href="/userRoles"
                                        className={`${styles.navLink} ${isCollapsed ? styles.navLinkCollapsed : styles.navLinkExpanded} ${pathname.startsWith('/userRoles') ? styles.activeNavLink : ''}`}
                                    >
                                        <FiUsers className={styles.navIcon} />
                                        <span className={styles.navLabel}>User Roles</span>
                                    </Link>
                                </li>
                                <li className={styles.navItem}>
                                    <Link
                                        href="/classes"
                                        className={`${styles.navLink} ${isCollapsed ? styles.navLinkCollapsed : styles.navLinkExpanded} ${pathname.startsWith('/classes') ? styles.activeNavLink : ''}`}
                                    >
                                        <FiBook className={styles.navIcon} />
                                        <span className={styles.navLabel}>Manage Classes</span>
                                    </Link>
                                </li>
                            </>
                        )}
                        {(userRole === 'teacher' || userRole === 'admin') && (
                            <li className={styles.navItem}>
                                <Link
                                    href="/subjects"
                                    className={`${styles.navLink} ${isCollapsed ? styles.navLinkCollapsed : styles.navLinkExpanded} ${pathname.startsWith('/subjects') ? styles.activeNavLink : ''}`}
                                >
                                    <FiBookOpen className={styles.navIcon} />
                                    <span className={styles.navLabel}>Manage Subjects</span>
                                </Link>
                            </li>
                        )}
                        {userRole !== 'student' && (
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
                <button
                    type="button"
                    className={`${styles.profileContainer} ${isCollapsed ? styles.profileContainerCollapsed : styles.profileContainerExpanded}`}
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    aria-expanded={showProfileMenu}
                    aria-label="Open profile menu"
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
                            <FiUser className={styles.navIcon} data-testid="fi-user-icon" />
                        </div>
                    )}
                    <span className={styles.navLabel}>{user.name}</span>
                    <FiSettings className={`${styles.navIcon} ${styles.navLabel}`} />
                </button>
                {showProfileMenu && (
                    <div
                        className={`${styles.profileMenu} ${isCollapsed ? styles.profileMenuCollapsed : styles.profileMenuExpanded}`}
                    >
                        <button
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="btn btn-danger w-100"
                        >
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
