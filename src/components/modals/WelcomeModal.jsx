'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import BaseModal from './BaseModal';
import { FiHome, FiCalendar, FaInfoCircle } from '@/components/icons';
import { db } from '@/firestore/firestoreClient';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * Welcome modal for new students explaining the app functionality
 * Checks Firestore to see if student has seen the modal before
 */
const WelcomeModal = ({ userEmail, userRole }) => {
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const checkWelcomeStatus = async () => {
            // Only show for students
            if (userRole !== 'student' || !userEmail) return;

            try {
                const userRef = doc(db, 'users', userEmail);
                const userDoc = await getDoc(userRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    // Show modal if hasSeenWelcome is undefined or false
                    if (!userData.hasSeenWelcome) {
                        setShowModal(true);
                    }
                }
            } catch (error) {
                console.error('Error checking welcome status:', error);
            }
        };

        checkWelcomeStatus();
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
        <BaseModal
            show={showModal}
            onHide={handleClose}
            title="Welcome to Kings Talloc"
            size="lg"
            showFooter={true}
            customFooter={
                <div className="w-100 d-flex justify-content-center">
                    <button
                        type="button"
                        className="btn btn-primary px-4"
                        onClick={handleClose}
                    >
                        Get Started
                    </button>
                </div>
            }
        >
            {/* overide base modal pading */}
            <div className="text-center" style={{ marginTop: '-1.5rem' }}>
                {/* School Crest */}
                <div className="d-flex justify-content-center">
                    <Image
                        src="/TKS-CREST-PMS.svg"
                        alt="The King's School Logo"
                        width={250}
                        height={250}
                        className="rounded"
                    />
                </div>

                {/* Introduction */}
                <p className="lead mb-">
                    Kings Talloc is your tutoring booking platform for the Computing Studies Department at The King&apos;s School.
                </p>

                {/* Dashboard Section */}
                <div className="text-start mb-4 p-3 bg-light rounded d-flex align-items-center">
                    <div className="d-flex align-items-center justify-content-center me-3 flex-shrink-0" style={{ width: '40px' }}>
                        <FiHome size={24} className="text-primary" />
                    </div>
                    <div>
                        <h5 className="mb-1 fw-bold">Dashboard</h5>
                        <p className="mb-0">
                            View your upcoming tutoring sessions and see your tutoring schedule at a glance.
                        </p>
                    </div>
                </div>

                {/* Calendar Section */}
                <div className="text-start mb-4 p-3 bg-light rounded d-flex align-items-center">
                    <div className="d-flex align-items-center justify-content-center me-3 flex-shrink-0" style={{ width: '40px' }}>
                        <FiCalendar size={24} className="text-primary" />
                    </div>
                    <div>
                        <h5 className="mb-1 fw-bold">Calendar</h5>
                        <p className="mb-0">
                            Browse available tutoring sessions and manage your bookings. This is where you can see all tutors&apos; availability and book sessions.
                        </p>
                    </div>
                </div>

                {/* Calendar Legend */}
                <div className="text-start mb-4 p-3 border rounded">
                    <h6 className="fw-bold mb-3">Calendar Color Guide</h6>
                    <div className="d-flex flex-column gap-2">
                        <div className="d-flex align-items-center">
                            <div className="me-2" style={{ width: '20px', height: '20px', backgroundColor: 'lightgreen', border: '1px solid green', borderRadius: '3px' }}></div>
                            <small><strong>Green background:</strong> Tutor availabilities (darker = more tutors available)</small>
                        </div>
                        <div className="d-flex align-items-center">
                            <div className="me-2" style={{ width: '20px', height: '20px', backgroundColor: 'lightblue', border: '1px solid blue', borderRadius: '3px' }}></div>
                            <small><strong>Light blue:</strong> Your confirmed tutoring sessions</small>
                        </div>
                        <div className="d-flex align-items-center">
                            <div className="me-2" style={{ width: '20px', height: '20px', backgroundColor: 'orange', border: '1px solid darkorange', borderRadius: '3px' }}></div>
                            <small><strong>Orange:</strong> Pending booking requests (awaiting approval)</small>
                        </div>
                        <div className="d-flex align-items-center">
                            <div className="me-2" style={{ width: '20px', height: '20px', backgroundColor: 'red', border: '1px solid darkred', borderRadius: '3px' }}></div>
                            <small><strong>Red:</strong> Requires your confirmation or denied requests</small>
                        </div>
                    </div>
                </div>

                {/* Important Notice */}
                <div className="alert alert-success d-flex align-items-start">
                    <FaInfoCircle size={20} className="text-success me-2 mt-1 flex-shrink-0" />
                    <div className="text-start">
                        <strong>Important:</strong> All tutoring session bookings must be made through the Calendar tab. Navigate to Calendar to book, view, or cancel your sessions.
                    </div>
                </div>
            </div>
        </BaseModal>
    );
};

export default WelcomeModal;
