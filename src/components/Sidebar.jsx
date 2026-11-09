'use client';

import React, { useState, useEffect } from 'react';
import { User01, ChevronLeft, LogOut01, UserCheck01 } from '@untitledui/icons';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/untitled/button';
import { NavItemBase, SidebarNavigation } from '@/components/untitled/sidebar-navigation';
import styles from '@/styles/sidebar.module.css';
import useRoleToggle from '@/hooks/useRoleToggle';
import { AppLogout } from '@/lib/security/clientAuth';
import { navigationItemsForRole } from '@/constants/navigation';

const Sidebar = ({ user, userRole }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();
    const { hasAdminAccess, roleLabel, toggleRole: handleRoleToggle } = useRoleToggle(userRole);
    const items = navigationItemsForRole(userRole);
    const firstManagementItem = items.find(item => item.management);

    useEffect(() => {
        const checkMobile = () => {
            if (window.innerWidth < 768) setIsCollapsed(true);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <SidebarNavigation
            style={{ '--sidebar-w': isCollapsed ? '5rem' : '16rem' }}
            className={`${styles.sidebarContainer} ${isCollapsed ? styles.sidebarCollapsed : ''} desktop-only`}
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
    );
};

export default Sidebar;
