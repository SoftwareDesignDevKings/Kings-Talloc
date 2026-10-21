'use client';

import React, { useState, useEffect, useId } from 'react';
import { Dialog, Modal, ModalOverlay } from '@/components/untitled/modal';
import { Button } from '@/components/untitled/button';
import { ChevronDown, XClose, InfoCircle, Settings01, Calendar, Flag02 } from '@untitledui/icons';
import { TableCard } from '@/components/untitled/table-card';
import guidance from '@/styles/studentGuidance.module.css';
import styles from '@/styles/calendarControls.module.css';
import { db } from '@/firestore/firestoreClient';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { recordGetReads } from '@/lib/telemetry/clientReads';
import useAuthSession from '@/hooks/useAuthSession';
import CalendarColourGuide from '@/components/calendar/CalendarColourGuide';

/**
 * "How to use" modal for students to understand calendar colors and filtering
 * Auto-shows on first visit to calendar for students
 */
const CalendarHowToModal = ({ show, onHide, autoShow = false }) => {
    const { session, userRole } = useAuthSession();
    const [showModal, setShowModal] = useState(show);
    const [openSection, setOpenSection] = useState('colorsSection');
    const titleId = useId();

    useEffect(() => {
        let cancelled = false;
        // If autoShow is enabled and user is a student, check if they've seen it
        const checkCalendarHelpStatus = async () => {
            if (!autoShow || userRole !== 'student' || !session?.user?.email) return;

            try {
                const userRef = doc(db, 'users', session.user.email);
                const userDoc = await getDoc(userRef);
                recordGetReads('users:calendar-help-flag', userDoc);

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    // Show modal if hasSeenCalendarHelp is undefined or false
                    if (!cancelled && !userData.hasSeenCalendarHelp) {
                        setShowModal(true);
                    }
                }
            } catch (error) {
                console.error('Error checking calendar help status:', error);
            }
        };

        checkCalendarHelpStatus();
        return () => { cancelled = true; };
    }, [autoShow, session?.user?.email, userRole]);

    // Sync with external show prop
    useEffect(() => {
        setShowModal(show);
    }, [show]);

    const handleClose = async () => {
        setShowModal(false);
        if (onHide) onHide();

        // Update Firestore to mark calendar help as seen (only if autoShow was enabled)
        if (autoShow && session?.user?.email && userRole === 'student') {
            try {
                const userRef = doc(db, 'users', session.user.email);
                await updateDoc(userRef, {
                    hasSeenCalendarHelp: true
                });
            } catch (error) {
                console.error('Error updating calendar help status:', error);
            }
        }
    };

    return (
        <ModalOverlay isOpen={showModal} isDismissable onOpenChange={open => { if (!open) handleClose(); }} className={styles.helpOverlay}>
            <Modal className={styles.helpModal}>
                <Dialog aria-labelledby={titleId} className={styles.helpDialog}>
                    <header className={styles.helpHeader}>
                        <h5 id={titleId} className={styles.helpTitle}>How to use the calendar</h5>
                        <Button size="sm" color="tertiary" iconLeading={XClose} aria-label="Close" onClick={handleClose} />
                    </header>
                    <div className={styles.helpBody}>
            <div className={guidance.helpContent}>
                {/* Introduction */}
                <p className={guidance.helpIntro}>
                    This calendar shows when tutors are available and lets you book tutoring sessions.
                </p>

                {/* Accordions */}
                <div className={styles.helpAccordion} id="calendarHelpAccordion">

                                        {/* Calendar Colors Section - Default Open */}
                    <div className={styles.helpSection}>
                        <h2>
                            <Button size="sm" color="tertiary" className={styles.helpAccordionButton} iconLeading={Flag02} iconTrailing={ChevronDown} aria-expanded={openSection === 'colorsSection'} aria-controls="colorsSection" onClick={() => setOpenSection(current => current === 'colorsSection' ? null : 'colorsSection')}>
                                <span>What do the colours mean?</span>
                            </Button>
                        </h2>
                        <div id="colorsSection" hidden={openSection !== 'colorsSection'}>
                            <div className={styles.helpAccordionBody}>
                                <p className={guidance.spacedParagraph}>
                                    The calendar uses different colours to show different information:
                                </p>
                                <CalendarColourGuide userRole={userRole} descriptions />
                            </div>
                        </div>
                    </div>
                    
                    {/* Filter Panel Section */}
                    <div className={styles.helpSection}>
                        <h2>
                            <Button size="sm" color="tertiary" className={styles.helpAccordionButton} iconLeading={Settings01} iconTrailing={ChevronDown} aria-expanded={openSection === 'filterPanelSection'} aria-controls="filterPanelSection" onClick={() => setOpenSection(current => current === 'filterPanelSection' ? null : 'filterPanelSection')}>
                                <span>Using the filters</span>
                            </Button>
                        </h2>
                        <div id="filterPanelSection" hidden={openSection !== 'filterPanelSection'}>
                            <div className={styles.helpAccordionBody}>
                                <ol className={guidance.steps}>
                                    <li className={guidance.listItem}>
                                        <strong>Open the filters</strong> on the right of the calendar (on a phone, tap <strong>Filters</strong> above the calendar)
                                    </li>
                                    <li className={guidance.listItem}>
                                        <strong>Choose tutors</strong> from the dropdown to see only their availability
                                    </li>
                                    <li className={guidance.paragraph}>
                                        The calendar will update to show only the selected tutors&apos; available times
                                    </li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Event Interactions Section */}
                    <div className={styles.helpSection}>
                        <h2>
                            <Button size="sm" color="tertiary" className={styles.helpAccordionButton} iconLeading={Calendar} iconTrailing={ChevronDown} aria-expanded={openSection === 'interactionsSection'} aria-controls="interactionsSection" onClick={() => setOpenSection(current => current === 'interactionsSection' ? null : 'interactionsSection')}>
                                <span>Working with sessions</span>
                            </Button>
                        </h2>
                        <div id="interactionsSection" hidden={openSection !== 'interactionsSection'}>
                            <div className={styles.helpAccordionBody}>
                                <div className={guidance.spacedParagraph}>
                                    <strong>Click an event</strong>
                                    <p className={guidance.smallParagraph}>Click any session to see full details like location, tutor name, and other students attending.</p>
                                </div>
                                <div className={guidance.spacedParagraph}>
                                    <strong>Click a green time slot</strong>
                                    <p className={guidance.smallParagraph}>Click on a green background area to request a new tutoring session during that time.</p>
                                </div>
                                <div className={guidance.paragraph}>
                                    <strong>Check the legend</strong>
                                    <p className={guidance.smallParagraph}>The legend at the bottom of the filters is a quick reminder of what each colour means.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Booking Instructions */}
                <TableCard.Root className={guidance.notice}>
                    <InfoCircle width={20} height={20} aria-hidden="true" className={guidance.noticeIcon} />
                    <div>
                        <strong>To book a session:</strong> Click on a green time slot to see available tutors, then create a booking request. Your teacher will review and approve it.
                    </div>
                </TableCard.Root>

                {/* Bug Report */}
                <div className={guidance.support}>
                    <small >
                        Any bugs or errors? Please report to{' '}
                        <a
                            href="mailto:mienna@kings.edu.au"
                            className={guidance.supportLink}
                        >
                            mienna@kings.edu.au
                        </a>
                    </small>
                </div>
            </div>
                    </div>
                    <footer className={styles.helpFooter}>
                        <Button size="sm" color="primary" onClick={handleClose}>Got it</Button>
                    </footer>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
};

export default CalendarHowToModal;
