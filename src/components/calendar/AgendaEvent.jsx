'use client';

import React from 'react';
import styles from '@/styles/calendarSurface.module.css';

const WORK_TYPE_LABELS = { tutoring: 'Tutoring', coaching: 'Coaching', work: 'Work' };

// One row of the phone List view: title, who it's with, and its status.
const AgendaEvent = ({ event, style }) => {
    const people = (event.staff || []).map(person => person.label || person.value).filter(Boolean).join(', ');
    const isAvailability = event.entityType === 'tutorAvailabilities';
    const status = isAvailability
        ? 'Availability'
        : event.approvalStatus && event.approvalStatus !== 'approved'
            ? (event.approvalStatus === 'pending' ? 'Pending request' : 'Denied request')
            : WORK_TYPE_LABELS[event.workType];

    return (
        <div className={styles.agendaEvent} style={style}>
            <span className={styles.agendaTitle}>{event.title || (isAvailability ? 'Available' : 'Untitled')}</span>
            {(people || status) && (
                <span className={styles.agendaMeta}>{[status, people].filter(Boolean).join(' · ')}</span>
            )}
        </div>
    );
};

export default AgendaEvent;
