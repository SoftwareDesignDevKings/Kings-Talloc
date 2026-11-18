'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import DashboardDialog from '@/components/dashboard/DashboardDialog';
import { Button } from '@/components/untitled/button';
import styles from '@/styles/studentGuidance.module.css';
import { FeaturedIcon } from '@/components/untitled/featured-icon';
import { TableCard } from '@/components/untitled/table-card';
import { HomeLine, Calendar, InfoCircle } from '@untitledui/icons';
import { db } from '@/firestore/firestoreClient';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { recordGetReads } from '@/lib/telemetry/clientReads';
import CalendarColourGuide from '@/components/calendar/CalendarColourGuide';

/**
 * Welcome modal for new students explaining the app functionality
 * Checks Firestore to see if student has seen the modal before
 */
const WelcomeModal = ({ userEmail, userRole }) => {
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const checkWelcomeStatus = async () => {
            // Only show for students
            if (userRole !== 'student' || !userEmail) return;

            try {
                const userRef = doc(db, 'users', userEmail);
                const userDoc = await getDoc(userRef);
                recordGetReads('users:welcome-flag', userDoc);

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    // Show modal if hasSeenWelcome is undefined or false
                    if (!cancelled && !userData.hasSeenWelcome) {
                        setShowModal(true);
                    }
                }
            } catch (error) {
                console.error('Error checking welcome status:', error);
            }
        };

        checkWelcomeStatus();
        return () => { cancelled = true; };
    }, [userEmail, userRole]);

    const handleClose = async () => {
        setShowModal(false);

        // Update Firestore to mark welcome as seen
        try {
            const userRef = doc(db, 'users', userEmail);
            await updateDoc(userRef, {
                hasSeenWelcome: true
            });
        } catch (error) {
            console.error('Error updating welcome status:', error);
        }
    };

    return (
        <DashboardDialog
            show={showModal}
            onHide={handleClose}
            title="Welcome to Kings Talloc"
            size="lg"
            showFooter={true}
            customFooter={
                <div className={styles.footerActions}>
                    <Button
                        type="button"
                        size="md"
                        color="primary"
                        onClick={handleClose}
                    >
                        Get started
                    </Button>
                </div>
            }
        >
            <div className={styles.welcomeContent}>
                {/* School Crest */}
                <div className={styles.crest}>
                    <Image
                        src="/TKS-CREST-PMS.svg"
                        alt="The King's School Logo"
                        width={250}
                        height={250}
                        priority
                        unoptimized
                    />
                </div>

                {/* Introduction */}
                <p className={styles.intro}>
                    Kings Talloc is your tutoring booking platform for the Computing Studies Department at The King&apos;s School.
                </p>

                {/* Dashboard Section */}
                <TableCard.Root className={styles.featureCard}>
                    <FeaturedIcon icon={HomeLine} size="md" color="brand" theme="modern" aria-hidden="true" className={styles.featureIcon} />
                    <div>
                        <h5 className={styles.featureTitle}>Dashboard</h5>
                        <p className={styles.paragraph}>
                            View your upcoming tutoring sessions and see your tutoring schedule at a glance.
                        </p>
                    </div>
                </TableCard.Root>

                {/* Calendar Section */}
                <TableCard.Root className={styles.featureCard}>
                    <FeaturedIcon icon={Calendar} size="md" color="brand" theme="modern" aria-hidden="true" className={styles.featureIcon} />
                    <div>
                        <h5 className={styles.featureTitle}>Calendar</h5>
                        <p className={styles.paragraph}>
                            Browse available tutoring sessions and manage your bookings. This is where you can see all tutors&apos; availability and book sessions.
                        </p>
                    </div>
                </TableCard.Root>

                {/* Calendar Legend */}
                <TableCard.Root className={styles.legendCard}>
                    <h6 className={styles.legendTitle}>Calendar colour guide</h6>
                    <CalendarColourGuide userRole={userRole} descriptions />
                </TableCard.Root>

                {/* Important Notice */}
                <TableCard.Root className={styles.notice}>
                    <InfoCircle width={20} height={20} aria-hidden="true" className={styles.noticeIcon} />
                    <div className={styles.noticeText}>
                        <strong>Important:</strong> All tutoring session bookings must be made through the Calendar tab. Go to the Calendar to book sessions and view or change your pending requests.
                    </div>
                </TableCard.Root>
            </div>
        </DashboardDialog>
    );
};

export default WelcomeModal;
