'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { DotsHorizontal, LogOut01, User01, UserCheck01, XClose } from '@untitledui/icons';
import { Button } from '@/components/untitled/button';
import { Dialog, Modal, ModalOverlay } from '@/components/untitled/modal';
import useRoleToggle from '@/hooks/useRoleToggle';
import { AppLogout } from '@/lib/security/clientAuth';
import { navigationItemsForRole } from '@/constants/navigation';
import styles from '@/styles/mobileNav.module.css';

/**
 * Phone navigation: a labelled bottom tab bar for the everyday pages, and a "More"
 * sheet for management pages, the role switch and logout. Hidden from 768px up,
 * where the sidebar takes over.
 */
const MobileNav = ({ user, userRole, pendingHref = null, onNavigate }) => {
    const pathname = usePathname();
    // While a tapped tab is loading, it already shows as the current one.
    const activePath = pendingHref || pathname;
    const navigate = href => { if (!pathname.startsWith(href)) onNavigate?.(href); };
    const [moreOpen, setMoreOpen] = useState(false);
    const { hasAdminAccess, roleLabel, toggleRole } = useRoleToggle(userRole);
    const items = navigationItemsForRole(userRole);
    const tabs = items.filter(item => !item.management);
    const moreItems = items.filter(item => item.management);
    const moreIsCurrent = moreItems.some(item => activePath.startsWith(item.href));

    return (
        <>
            <nav aria-label="Main" className={`${styles.tabBar} mobile-only`}>
                {tabs.map(({ href, label, shortLabel, icon: Icon }) => {
                    const current = activePath.startsWith(href);
                    return (
                        <Link key={href} href={href} className={styles.tab} aria-current={current ? 'page' : undefined}
                            onClick={() => navigate(href)}>
                            <Icon aria-hidden="true" className={styles.tabIcon} />
                            <span>{shortLabel || label}</span>
                        </Link>
                    );
                })}
                <button type="button" className={styles.tab} aria-current={moreIsCurrent ? 'page' : undefined}
                    aria-haspopup="dialog" aria-expanded={moreOpen} onClick={() => setMoreOpen(true)}>
                    <DotsHorizontal aria-hidden="true" className={styles.tabIcon} />
                    <span>More</span>
                </button>
            </nav>

            <ModalOverlay isOpen={moreOpen} onOpenChange={setMoreOpen} isDismissable className={styles.sheetOverlay}>
                <Modal className={styles.sheet}>
                    <Dialog aria-label="More" className={styles.sheetDialog}>
                        <div className={styles.sheetHeader}>
                            <div className={styles.profile}>
                                {user?.image ? (
                                    <Image src={user.image} alt="" width={40} height={40} className={styles.avatar} unoptimized />
                                ) : (
                                    <span className={styles.avatar}><User01 aria-hidden="true" /></span>
                                )}
                                <div className={styles.profileText}>
                                    <strong>{user?.name}</strong>
                                    <span>{user?.email}</span>
                                </div>
                            </div>
                            <Button size="sm" color="tertiary" iconLeading={XClose} aria-label="Close menu"
                                className={styles.closeButton} onClick={() => setMoreOpen(false)} />
                        </div>

                        {moreItems.length > 0 && (
                            <ul className={styles.sheetList}>
                                {moreItems.map(({ href, label, icon: Icon }) => (
                                    <li key={href}>
                                        <Link href={href} className={styles.sheetLink} onClick={() => { setMoreOpen(false); navigate(href); }}
                                            aria-current={pathname.startsWith(href) ? 'page' : undefined}>
                                            <Icon aria-hidden="true" className={styles.tabIcon} />
                                            {label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className={styles.sheetActions}>
                            {hasAdminAccess && (
                                <Button size="lg" color="secondary" iconLeading={UserCheck01}
                                    onClick={() => { toggleRole(); setMoreOpen(false); }}>
                                    {roleLabel}
                                </Button>
                            )}
                            <Button size="lg" color="secondary-destructive" iconLeading={LogOut01} onClick={AppLogout}>
                                Log out
                            </Button>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </>
    );
};

export default MobileNav;
