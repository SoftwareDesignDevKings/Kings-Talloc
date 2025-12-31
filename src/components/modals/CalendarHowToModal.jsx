'use client';

import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import { FaInfoCircle, FiSettings, MdEventNote, MdFlag } from '@/components/icons';
import { db } from '@/firestore/firestoreClient';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import useAuthSession from '@/hooks/useAuthSession';

/**
 * "How to use" modal for students to understand calendar colors and filtering
 * Auto-shows on first visit to calendar for students
 */
const CalendarHowToModal = ({ show, onHide, autoShow = false }) => {
    const { session, userRole } = useAuthSession();
    const [showModal, setShowModal] = useState(show);

    useEffect(() => {
        // If autoShow is enabled and user is a student, check if they've seen it
        const checkCalendarHelpStatus = async () => {
            if (!autoShow || userRole !== 'student' || !session?.user?.email) return;

            try {
                const userRef = doc(db, 'users', session.user.email);
                const userDoc = await getDoc(userRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    // Show modal if hasSeenCalendarHelp is undefined or false
                    if (!userData.hasSeenCalendarHelp) {
                        setShowModal(true);
                    }
                }
            } catch (error) {
                console.error('Error checking calendar help status:', error);
            }
        };

        checkCalendarHelpStatus();
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
        <BaseModal
            show={showModal}
            onHide={handleClose}
            title="How to Use the Calendar"
            size="lg"
            showFooter={true}
            customFooter={
                <div className="w-100 d-flex justify-content-center">
                    <button
                        type="button"
                        className="btn btn-primary px-4"
                        onClick={handleClose}
                    >
                        Got it!
                    </button>
                </div>
            }
        >
            <div className="text-start">
                {/* Introduction */}
                <p className="mb-4 text-center">
                    This calendar shows when tutors are available and lets you book tutoring sessions.
                </p>

                {/* Accordions */}
                <div className="accordion mb-4" id="calendarHelpAccordion">

                                        {/* Calendar Colors Section - Default Open */}
                    <div className="accordion-item">
                        <h2 className="accordion-header">
                            <button className="accordion-button d-flex align-items-center gap-2" type="button" data-bs-toggle="collapse" data-bs-target="#colorsSection">
                                <MdFlag size={18} className="text-primary" />
                                <span>What do the Colours mean?</span>
                            </button>
                        </h2>
                        <div id="colorsSection" className="accordion-collapse collapse show" data-bs-parent="#calendarHelpAccordion">
                            <div className="accordion-body">
                                <p className="mb-3">
                                    The calendar uses different colors to show different information:
                                </p>
                                <div className="d-flex flex-column gap-2">
                                    <div className="d-flex align-items-start">
                                        <div className="me-3 mt-1" style={{
                                            minWidth: '24px',
                                            height: '24px',
                                            backgroundColor: 'rgba(144, 238, 144, 0.5)',
                                            border: '1px solid green',
                                            borderRadius: '3px'
                                        }}></div>
                                        <div>
                                            <strong>Green background</strong>
                                            <p className="mb-0 small">Shows when tutors are available. Darker green = more tutors free.</p>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-start">
                                        <div className="me-3 mt-1" style={{
                                            minWidth: '24px',
                                            height: '24px',
                                            backgroundColor: 'lightblue',
                                            border: '1px solid blue',
                                            borderRadius: '3px'
                                        }}></div>
                                        <div>
                                            <strong>Light blue</strong>
                                            <p className="mb-0 small">Your confirmed tutoring sessions (approved and ready to go).</p>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-start">
                                        <div className="me-3 mt-1" style={{
                                            minWidth: '24px',
                                            height: '24px',
                                            backgroundColor: 'orange',
                                            border: '1px solid darkorange',
                                            borderRadius: '3px'
                                        }}></div>
                                        <div>
                                            <strong>Orange</strong>
                                            <p className="mb-0 small">Waiting for teacher approval on your booking request.</p>
                                        </div>
                                    </div>
                                    <div className="d-flex align-items-start">
                                        <div className="me-3 mt-1" style={{
                                            minWidth: '24px',
                                            height: '24px',
                                            backgroundColor: 'red',
                                            border: '1px solid darkred',
                                            borderRadius: '3px'
                                        }}></div>
                                        <div>
                                            <strong>Red</strong>
                                            <p className="mb-0 small">Your booking was denied.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Filter Panel Section */}
                    <div className="accordion-item">
                        <h2 className="accordion-header">
                            <button className="accordion-button collapsed d-flex align-items-center gap-2" type="button" data-bs-toggle="collapse" data-bs-target="#filterPanelSection">
                                <FiSettings size={18} className="text-primary" />
                                <span>Using the Filter Panel</span>
                            </button>
                        </h2>
                        <div id="filterPanelSection" className="accordion-collapse collapse" data-bs-parent="#calendarHelpAccordion">
                            <div className="accordion-body">
                                <ol className="mb-0">
                                    <li className="mb-2">
                                        <strong>Select a subject</strong> from the first dropdown (e.g. Software, IB CompSci)
                                    </li>
                                    <li className="mb-2">
                                        <strong>Choose tutors</strong> from the second dropdown to see only their availabilities
                                    </li>
                                    <li className="mb-0">
                                        The calendar will update to show only the selected tutors&apos; available times
                                    </li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Event Interactions Section */}
                    <div className="accordion-item">
                        <h2 className="accordion-header">
                            <button className="accordion-button collapsed d-flex align-items-center gap-2" type="button" data-bs-toggle="collapse" data-bs-target="#interactionsSection">
                                <MdEventNote size={18} className="text-primary" />
                                <span>Working with Events</span>
                            </button>
                        </h2>
                        <div id="interactionsSection" className="accordion-collapse collapse" data-bs-parent="#calendarHelpAccordion">
                            <div className="accordion-body">
                                <div className="mb-3">
                                    <strong>Click an event</strong>
                                    <p className="mb-0 small">Click any session to see full details like location, tutor name, and other students attending.</p>
                                </div>
                                <div className="mb-3">
                                    <strong>Click a green time slot</strong>
                                    <p className="mb-0 small">Click on a green background area to request a new tutoring session during that time.</p>
                                </div>
                                <div className="mb-0">
                                    <strong>Check the legend</strong>
                                    <p className="mb-0 small">Look at the small legend in the bottom-right corner for a quick reminder of what each color means.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Booking Instructions */}
                <div className="alert alert-success d-flex align-items-start mb-3">
                    <FaInfoCircle size={20} className="text-success me-2 mt-1 flex-shrink-0" />
                    <div>
                        <strong>To book a session:</strong> Click on a green time slot to see available tutors, then create a booking request. Your teacher will review and approve it.
                    </div>
                </div>

                {/* Bug Report */}
                <div className="text-center pt-2 border-top">
                    <small className="text-muted">
                        Any bugs or errors? Please report to{' '}
                        <a
                            href="mailto:mienna@kings.edu.au"
                            className="text-primary fw-semibold text-decoration-none"
                            style={{ borderBottom: '1px solid currentColor' }}
                        >
                            mienna@kings.edu.au
                        </a>
                    </small>
                </div>
            </div>
        </BaseModal>
    );
};

export default CalendarHowToModal;
