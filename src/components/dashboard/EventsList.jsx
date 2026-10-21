import React from 'react';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { Calendar } from '@untitledui/icons';
import { formatDisplayDate, formatDisplayTime } from '@/utils/displayDate';
import { TableCard } from '@/components/untitled/table-card';
import { Badge } from '@/components/untitled/badge';
import { FeaturedIcon } from '@/components/untitled/featured-icon';
import styles from '@/styles/dashboard.module.css';

const WORK_TYPE_BADGE = {
    coaching: { label: 'Coaching', color: 'purple' },
    tutoring: { label: 'Tutoring', color: 'brand' },
    work: { label: 'Work', color: 'gray' },
};
const EventItem = ({ event, userRole, isToday }) => {
    const staffNames = event.staff?.map(s => s.label || s.value || s) || [];
    const showStaff = ['teacher', 'admin', 'student'].includes(userRole) && staffNames.length > 0;
    const showApprovalStatus = ['teacher', 'admin', 'student'].includes(userRole);
    const isPending = showApprovalStatus && event.createdByStudent && event.approvalStatus === 'pending';
    const isApproved = showApprovalStatus && event.createdByStudent && event.approvalStatus === 'approved';
    // Students know work sessions (their tutoring requests) as tutoring.
    const workTypeBadge = WORK_TYPE_BADGE[userRole === 'student' && event.workType === 'work' ? 'tutoring' : event.workType];
    return (
        <li className={styles.eventItem}>
            <div className={styles.eventTime}>
                <span>{isToday ? formatDisplayTime(event.start) : formatDisplayDate(event.start)}</span>
                <span>{isToday ? formatDisplayTime(event.end) : `${formatDisplayTime(event.start)} – ${formatDisplayTime(event.end)}`}</span>
            </div>
            <div className={styles.eventContent}>
                <div className={styles.eventTitleRow}>
                    <span className={styles.eventTitle}>{event.title}</span>
                    {workTypeBadge && <Badge color={workTypeBadge.color} size="sm">{workTypeBadge.label}</Badge>}
                    {isPending && <Badge color="warning" size="sm">Pending</Badge>}
                    {isApproved && <Badge color="success" size="sm">Approved</Badge>}
                </div>
                {event.description && <p className={styles.eventDescription}>{event.description}</p>}
                <div className={styles.eventDetails}>
                    {showStaff && <span>{userRole === 'student' ? 'Tutor: ' : ''}{staffNames.join(', ')}</span>}
                    {event.students?.length > 0 && <span>
                        {showStaff && '·'}{' '}
                        {event.students.length} student{event.students.length !== 1 ? 's' : ''}
                    </span>}
                </div>
            </div>
        </li>
    );
};
const EventsList = ({ events, title, emptyMessage, userRole, isToday = false, isLoading = false, totalCount = events.length }) => (
    <TableCard.Root aria-busy={isLoading}>
        <header className={styles.listHeader}>
            <Calendar aria-hidden="true" />
            <h6 className={styles.listTitle}>{title}</h6>
            {!isLoading && events.length > 0 && <Badge color="gray" size="sm">{totalCount > events.length ? `${events.length} of ${totalCount}` : events.length}</Badge>}
        </header>
        {isLoading ? <div className={styles.emptyState} aria-hidden="true">
            <LoadingSkeleton width="55%" height="18px" />
            <LoadingSkeleton width="35%" height="14px" />
        </div> : events.length === 0 ? <div className={styles.emptyState}>
            <FeaturedIcon icon={Calendar} color="gray" size="md" aria-hidden="true" />
            <p>{emptyMessage}</p>
        </div> : <ul className={styles.eventList}>
            {events.map(event => <EventItem key={event.id} event={event} userRole={userRole} isToday={isToday} />)}
        </ul>}
    </TableCard.Root>
);
export default EventsList;
