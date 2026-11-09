'use client';

import React from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, MarkerPin01, Users01, User01, BookOpen01 } from '@untitledui/icons';
import { SiMicrosoftTeams } from '@/components/icons';
import { Button } from '@/components/untitled/button';
import { sessionFocusLabel } from '@/lib/scheduling/sessionFocus';
import styles from '@/styles/eventSummary.module.css';

const WORK_TYPE_LABELS = { tutoring: 'Tutoring', coaching: 'Coaching', work: 'Work' };
const WORK_STATUS_LABELS = { completed: 'Completed', notAttended: "Student didn't attend" };
const LOCATION_LABELS = { onsite: 'On site', remote: 'Online' };
const MAX_NAMES = 4;

const validDate = raw => {
    const date = new Date(raw);
    return raw && !Number.isNaN(date.getTime()) ? date : null;
};

const names = people => (people || []).map(person => person?.label || person?.value).filter(Boolean);

const nameList = list => (list.length > MAX_NAMES
    ? `${list.slice(0, MAX_NAMES).join(', ')} and ${list.length - MAX_NAMES} more`
    : list.join(', '));

/**
 * Read-only summary of a booking for phones, shown in place of the greyed-out form fields.
 * Only renders what the booking actually has.
 */
const EventSummary = ({ event }) => {
    const start = validDate(event.start);
    const end = validDate(event.end);
    const staff = names(event.staff);
    const students = names([...(event.students || []), ...(event.additionalStudents || [])]);
    const classes = names(event.classes);
    const status = event.approvalStatus === 'pending' ? 'Pending request'
        : event.approvalStatus === 'denied' ? 'Denied request'
            : WORK_STATUS_LABELS[event.workStatus] || WORK_TYPE_LABELS[event.workType];
    const notes = [event.description, event.sessionTopics].filter(Boolean).join('\n\n');
    const focus = event.preference ? sessionFocusLabel(event.preference) : '';

    const rows = [
        start && { icon: Calendar, label: 'Date', value: format(start, 'EEEE d MMMM yyyy') },
        start && end && { icon: Clock, label: 'Time', value: `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}` },
        staff.length > 0 && { icon: User01, label: staff.length > 1 ? 'Tutors' : 'Tutor', value: nameList(staff) },
        students.length > 0 && { icon: Users01, label: students.length > 1 ? 'Students' : 'Student', value: nameList(students) },
        classes.length > 0 && { icon: BookOpen01, label: classes.length > 1 ? 'Classes' : 'Class', value: nameList(classes) },
        LOCATION_LABELS[event.locationType] && { icon: MarkerPin01, label: 'Location', value: LOCATION_LABELS[event.locationType] },
    ].filter(Boolean);

    return (
        <section className={styles.summary} aria-label="Booking summary">
            <div className={styles.heading}>
                <h3 className={styles.title}>{event.title || 'Session'}</h3>
                {status && <span className={styles.status}>{status}</span>}
            </div>
            <dl className={styles.rows}>
                {rows.map(({ icon: Icon, label, value }) => (
                    <div key={label} className={styles.row}>
                        <dt><Icon aria-hidden="true" /><span className="visually-hidden">{label}</span></dt>
                        <dd>{value}</dd>
                    </div>
                ))}
            </dl>
            {focus && <p className={styles.focus}><strong>Focus:</strong> {focus}</p>}
            {notes && <p className={styles.notes}>{notes}</p>}
            {event.teamsJoinUrl && (
                <Button size="lg" color="primary" href={event.teamsJoinUrl} target="_blank" rel="noopener noreferrer" className={styles.join}>
                    <SiMicrosoftTeams size={18} />Join Teams meeting
                </Button>
            )}
        </section>
    );
};

export default EventSummary;
