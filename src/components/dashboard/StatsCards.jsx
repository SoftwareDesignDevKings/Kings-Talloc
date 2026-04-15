import React, { useState, useEffect, useRef } from 'react';
import { FiChevronDown, FiAlertCircle } from '@/components/icons';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firestore/firestoreClient.js';
import {
    createEventInFirestore,
    deleteEventFromFirestore,
    addOrUpdateEventInQueue,
} from '@/firestore/firestoreOperations';
import { calendarEventCreateTeamsMeeting } from '@/utils/calendarEvent';
import useAlert from '@/hooks/useAlert';
import useAuthSession from '@/hooks/useAuthSession';
import styles from '@/styles/statsStrip.module.css';

/* ── Shared primitives ───────────────────────────────────────── */

const StatItem = ({ label, value, sub }) => (
    <div className={styles.item}>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>{value}</p>
        {sub && <p className={styles.sub}>{sub}</p>}
    </div>
);

/* ── Teacher stats ───────────────────────────────────────────── */

const TeacherStats = ({ data, onUpdate }) => {
    const [showApprovalsDropdown, setShowApprovalsDropdown] = useState(false);
    const { addAlert } = useAlert();
    const { session } = useAuthSession();
    const userEmail = session?.user?.email;
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowApprovalsDropdown(false);
            }
        };
        if (showApprovalsDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showApprovalsDropdown]);

    const handleApproveRequest = async (requestId) => {
        try {
            const request = data.pendingRequestsData.find((req) => req.id === requestId);
            if (!request) {
                addAlert('error', 'Request not found');
                return;
            }
            const eventData = {
                title: request.title || 'Tutoring',
                start: request.start,
                end: request.end,
                description: request.description || '',
                students: request.students || [],
                staff: request.staff || [],
                subject: request.subject,
                preference: request.preference,
                createdByStudent: true,
                approvalStatus: 'approved',
                approvedAt: new Date(),
                workStatus: 'notCompleted',
                workType: 'tutoring',
                createTeamsMeeting: true,
            };
            await deleteEventFromFirestore(requestId, 'studentEventRequests');
            const docId = await createEventInFirestore(eventData);
            await addOrUpdateEventInQueue({ ...eventData, id: docId }, 'store', userEmail);
            calendarEventCreateTeamsMeeting(docId, eventData, { addAlert }).catch((error) => {
                addAlert('error', `Event approved but Teams meeting failed: ${error.message}`);
            });
            addAlert('success', 'Request approved. Teams meeting is being created…');
            if (onUpdate) onUpdate();
        } catch (error) {
            addAlert('error', `Failed to approve request: ${error.message}`);
        }
    };

    const handleRejectRequest = async (requestId) => {
        try {
            const requestRef = doc(db, 'studentEventRequests', requestId);
            await updateDoc(requestRef, { approvalStatus: 'rejected', rejectedAt: new Date() });
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error rejecting request:', error);
        }
    };

    const handleDeleteRequest = async (requestId) => {
        try {
            const requestRef = doc(db, 'studentEventRequests', requestId);
            await deleteDoc(requestRef);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error deleting request:', error);
        }
    };

    return (
        <div className={styles.strip}>
            <StatItem
                label="Upcoming Events"
                value={data.upcomingEventsCount}
            />

            {/* Pending Approvals — interactive cell with dropdown */}
            <div className={styles.item} ref={dropdownRef}>
                <button
                    className={styles.itemButton}
                    onClick={() => setShowApprovalsDropdown(!showApprovalsDropdown)}
                    aria-expanded={showApprovalsDropdown}
                    aria-haspopup="listbox"
                >
                    <div>
                        <p className={styles.label}>Pending Approvals</p>
                        <p className={styles.value}>{data.unapprovedStudentRequests || 0}</p>
                    </div>
                    <FiChevronDown className={styles.chevron} size={16} />
                </button>

                {showApprovalsDropdown && (
                    <div
                        className="position-absolute start-0 w-100 mt-2 bg-white border rounded shadow-lg"
                        style={{ zIndex: 1050, maxHeight: '400px', overflowY: 'auto', top: '100%' }}
                    >
                        {!data.pendingRequestsData || data.pendingRequestsData.length === 0 ? (
                            <div className="p-4 text-center text-muted small">
                                No pending approvals
                            </div>
                        ) : (
                            <div className="list-group list-group-flush">
                                {data.pendingRequestsData.map((request) => (
                                    <div key={request.id} className="list-group-item">
                                        <div className="d-flex flex-column gap-2">
                                            <div>
                                                <div className="fw-semibold">
                                                    {request.title || 'Untitled Request'}
                                                </div>
                                                <div className="small text-muted mt-1">
                                                    {request.students?.length > 0 && (
                                                        <div>
                                                            <strong>Student:</strong>{' '}
                                                            {request.students.map((s) => s.label || s.value).join(', ')}
                                                        </div>
                                                    )}
                                                    {request.staff?.length > 0 && (
                                                        <div>
                                                            <strong>Tutor:</strong>{' '}
                                                            {request.staff.map((t) => t.label || t.value).join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="small text-muted">
                                                <div>
                                                    {format(request.start, 'MMM d, yyyy h:mm a')} –{' '}
                                                    {format(request.end, 'h:mm a')}
                                                </div>
                                                {request.subject && (
                                                    <div>
                                                        Subject:{' '}
                                                        {typeof request.subject === 'string'
                                                            ? request.subject
                                                            : request.subject.label}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="d-flex gap-2">
                                                <button
                                                    className="btn btn-sm btn-outline-success"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleApproveRequest(request.id);
                                                    }}
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline-secondary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRejectRequest(request.id);
                                                    }}
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteRequest(request.id);
                                                    }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <StatItem
                label="Tutors In Today"
                value={data.tutorsScheduledToday}
            />
            <StatItem
                label="Allocated Hours"
                value={(data.weeklyHours.tutoring + data.weeklyHours.coaching).toFixed(1) + ' hours'}
                sub={`Tutoring ${data.weeklyHours.tutoring} hours · Coaching ${data.weeklyHours.coaching} hours`}
            />
        </div>
    );
};

/* ── Tutor stats ─────────────────────────────────────────────── */

const TutorStats = ({ data }) => (
    <>
        <div className={styles.strip}>
            <StatItem
                label="Upcoming Sessions"
                value={data.upcomingEventsCount}
            />
            <StatItem
                label="Hours This Week"
                value={(data.weeklyHours.tutoring + data.weeklyHours.coaching).toFixed(1) + ' hours'}
                sub={`Tutoring ${data.weeklyHours.tutoring} hours · Coaching ${data.weeklyHours.coaching} hours`}
            />
            <StatItem
                label="Needs Completion"
                value={data.needsCompletion}
                sub={`${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'dd/MM/yy')} – ${format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'dd/MM/yy')}`}
            />
            <StatItem
                label="Students Helped"
                value={data.uniqueStudents}
            />
        </div>
        {data.needsConfirmation > 0 && (
            <div className="alert alert-warning mb-4 d-flex align-items-center gap-2">
                <FiAlertCircle size={18} className="shrink-0" />
                <span>
                    You have {data.needsConfirmation} event{data.needsConfirmation !== 1 ? 's' : ''} requiring your confirmation.
                </span>
            </div>
        )}
    </>
);

/* ── Student stats ───────────────────────────────────────────── */

const StudentStats = ({ data }) => (
    <div className={styles.strip}>
        <StatItem
            label="Upcoming Sessions"
            value={data.upcomingEventsCount}
        />
        <StatItem
            label="Hours This Week"
            value={(data.weeklyHours.tutoring + data.weeklyHours.coaching).toFixed(1) + ' hours'}
        />
        <StatItem
            label="Pending Requests"
            value={data.pendingRequests}
        />
        <StatItem
            label="Approved Requests"
            value={data.approvedRequests}
        />
    </div>
);

/* ── Root export ─────────────────────────────────────────────── */

const StatsCards = ({ userRole, data, onUpdate }) => {
    if (userRole === 'teacher' || userRole === 'admin') {
        return <TeacherStats data={data} onUpdate={onUpdate} />;
    }
    if (userRole === 'tutor') {
        return <TutorStats data={data} />;
    }
    if (userRole === 'student') {
        return <StudentStats data={data} />;
    }
    return null;
};

export default StatsCards;
