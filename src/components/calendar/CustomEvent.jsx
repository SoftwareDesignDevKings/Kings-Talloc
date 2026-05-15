'use client';

import React, { useState } from 'react';
import { MdContentCopy } from '@/components/icons';
import styles from '@/styles/customEvent.module.css';

/**
 * Extract initials from a staff member's name or email
 * @param {Object} staffMember - Staff object with {value: email, label: name}
 * @returns {string} - Initials (e.g., "JD" for "John Doe")
 */
const getStaffInitials = (staffMember) => {
    if (!staffMember) return '';

    const name = staffMember.label || staffMember.value || '';

    // Split name by spaces
    const nameParts = name.trim().split(/\s+/);

    if (nameParts.length > 1) {
        // Multiple words: take first letter of each word
        return nameParts
            .map(part => part.charAt(0).toUpperCase())
            .join('');
    } else {
        // Single word or email: take first 2 characters
        return name.substring(0, 2).toUpperCase();
    }
};

/**
 * Check if event is a booked shift (not a pending/denied student request)
 * @param {Object} event - Calendar event object
 * @returns {boolean} - True if this is a booked shift
 */
const isBookedShift = (event) => {
    // Must be a shift entity type
    if (event.entityType !== 'shifts') return false;

    // Either teacher-created or approved student request
    return !event.createdByStudent || event.approvalStatus === 'approved';
};

const getTutorInitials = (tutorEmail, tutors) => {
    if (!tutorEmail) return '';
    const tutor = tutors?.find(t => t.email === tutorEmail);
    if (tutor?.name) return getStaffInitials({ label: tutor.name });
    // fallback: derive from email local part (e.g. john.doe@... → JD)
    const localPart = tutorEmail.split('@')[0];
    const parts = localPart.split('.');
    return parts.map(p => p.charAt(0).toUpperCase()).join('');
};

const CustomEvent = ({ event, canDuplicate, onDuplicate, tutors }) => {
    const [showDuplicate, setShowDuplicate] = useState(false);

    const handleDuplicateClick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (onDuplicate) {
            onDuplicate(event);
        }
    };

    const stopCalendarSelection = (e) => {
        e.stopPropagation();
    };

    const handleMouseUp = (e) => {
        e.stopPropagation();
    };

    const staffInitials = isBookedShift(event) && event.staff?.length > 0
        ? event.staff.map(getStaffInitials).join(', ')
        : event.entityType === 'tutorAvailabilities' && event.tutor
            ? getTutorInitials(event.tutor, tutors)
            : '';

    return (
        <div
            className={`rbc-event-content ${styles.eventContainer}`}
            onMouseEnter={() => setShowDuplicate(true)}
            onMouseLeave={() => setShowDuplicate(false)}
        >
            <div className={styles.eventTitle}>{event.title}</div>
            {staffInitials && (
                <div className={styles.staffInitials}>({staffInitials})</div>
            )}

            {canDuplicate && showDuplicate && (
                <button
                    type="button"
                    onClick={handleDuplicateClick}
                    onPointerDownCapture={stopCalendarSelection}
                    onMouseDownCapture={stopCalendarSelection}
                    onMouseDown={stopCalendarSelection}
                    onMouseUp={handleMouseUp}
                    className={styles.duplicateButton}
                    title="Duplicate event"
                >
                    <MdContentCopy size={16} />
                </button>
            )}
        </div>
    );
};

export default CustomEvent;
