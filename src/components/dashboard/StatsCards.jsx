import React, { useState } from 'react';
import {
    FiCalendar,
    FiUsers,
    FiClock,
    FiCheckCircle,
    FiAlertCircle,
    FiTrendingUp,
    FiBookOpen,
    FiActivity,
    FiChevronDown,
} from '@/components/icons';
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

const StatCard = ({ icon: Icon, iconBgColor, title, value, subtitle }) => (
    <div className="col-12 col-md-4 col-lg-3">
        <div className="card border-0 shadow-sm">
            <div className="card-body">
                <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                        <div className={`${iconBgColor} bg-opacity-10 rounded p-3`}>
                            <Icon className={iconBgColor.replace('bg-', 'text-')} size={24} />
                        </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                        <h6 className="text-muted mb-1 small">{title}</h6>
                        <h3 className="mb-0 fw-bold">{value}</h3>
                        {subtitle && <small className="text-muted">{subtitle}</small>}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const TeacherStats = ({ data, onUpdate }) => {
    const [showApprovalsDropdown, setShowApprovalsDropdown] = useState(false);
    const { addAlert } = useAlert();

    const handleApproveRequest = async (requestId) => {
        try {

            // Find the request data
            const request = data.pendingRequestsData.find((req) => req.id === requestId);
            if (!request) {
                console.error('[StatsCards] Request not found');
                addAlert('error', 'Request not found');
                return;
            }

            // Create event data for the main events collection
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
                createTeamsMeeting: true, // Automatically create Teams meeting
            };

            // Delete from studentEventRequests and create in events collection
            await deleteEventFromFirestore(requestId, 'studentEventRequests');

            const docId = await createEventInFirestore(eventData);

            // Queue email notification
            await addOrUpdateEventInQueue({ ...eventData, id: docId }, 'store');

            // Create Teams meeting in background (don't wait)
            calendarEventCreateTeamsMeeting(docId, eventData, {
                addAlert,
            }).catch((error) => {
                console.error('[StatsCards] Teams meeting creation failed:', error);
                addAlert('error', `Event approved but Teams meeting failed: ${error.message}`);
            });

            addAlert('success', 'Request approved successfully. Teams meeting is being created...');

            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('[StatsCards] Error approving request:', error);
            addAlert('error', `Failed to approve request: ${error.message}`);
        }
    };

    const handleRejectRequest = async (requestId) => {
        try {
            const requestRef = doc(db, 'studentEventRequests', requestId);
            await updateDoc(requestRef, {
                approvalStatus: 'rejected',
                rejectedAt: new Date(),
            });
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
        <>
            <StatCard
                icon={FiCalendar}
                iconBgColor="bg-primary"
                title="Upcoming Events"
                value={data.upcomingEventsCount}
            />

            <div className="col-12 col-md-4 col-lg-3">
                <div
                    className="card border-0 shadow-sm position-relative"
                    style={{ cursor: 'pointer', outline: 'none' }}
                    tabIndex={-1}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    <div
                        className="card-body"
                        onClick={() => setShowApprovalsDropdown(!showApprovalsDropdown)}
                        style={{ outline: 'none' }}
                    >
                        <div className="d-flex align-items-center">
                            <div className="flex-shrink-0">
                                <div className="bg-warning bg-opacity-10 rounded p-3">
                                    <FiClock className="text-warning" size={24} />
                                </div>
                            </div>
                            <div className="flex-grow-1 ms-3">
                                <h6 className="text-muted mb-1 small">Pending Approvals</h6>
                                <h3 className="mb-0 fw-bold">
                                    {data.unapprovedStudentRequests || 0}
                                </h3>
                            </div>
                            <FiChevronDown className="text-muted ms-2" />
                        </div>
                    </div>

                    {showApprovalsDropdown && (
                        <div
                            className="position-absolute top-100 start-0 w-100 mt-2 bg-white border rounded shadow-lg"
                            style={{ zIndex: 1050, maxHeight: '400px', overflowY: 'auto' }}
                        >
                            {!data.pendingRequestsData || data.pendingRequestsData.length === 0 ? (
                                <div className="p-4 text-center text-muted">
                                    <div className="small">No pending approvals</div>
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
                                                        {request.students &&
                                                            request.students.length > 0 && (
                                                                <div>
                                                                    <strong>Student:</strong>{' '}
                                                                    {request.students
                                                                        .map(
                                                                            (s) =>
                                                                                s.label || s.value,
                                                                        )
                                                                        .join(', ')}
                                                                </div>
                                                            )}
                                                        {request.staff &&
                                                            request.staff.length > 0 && (
                                                                <div>
                                                                    <strong>Tutor:</strong>{' '}
                                                                    {request.staff
                                                                        .map(
                                                                            (t) =>
                                                                                t.label || t.value,
                                                                        )
                                                                        .join(', ')}
                                                                </div>
                                                            )}
                                                    </div>
                                                </div>

                                                <div className="small text-muted">
                                                    <div>
                                                        {format(
                                                            request.start,
                                                            'MMM d, yyyy h:mm a',
                                                        )}{' '}
                                                        - {format(request.end, 'h:mm a')}
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
                                                        className="btn btn-sm btn-success"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleApproveRequest(request.id);
                                                        }}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-secondary"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRejectRequest(request.id);
                                                        }}
                                                    >
                                                        Reject
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-danger"
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
            </div>

            <StatCard
                icon={FiUsers}
                iconBgColor="bg-info"
                title="Active Tutors"
                value={`${data.activeTutors}/${data.totalTutors}`}
            />
            <StatCard
                icon={FiTrendingUp}
                iconBgColor="bg-success"
                title="Weekly Utilization"
                value={`${data.weeklyUtilization}%`}
            />
        </>
    );
};

const TutorStats = ({ data }) => (
    <>
        <StatCard
            icon={FiCalendar}
            iconBgColor="bg-primary"
            title="Upcoming Sessions"
            value={data.upcomingEventsCount}
        />
        <StatCard
            icon={FiActivity}
            iconBgColor="bg-success"
            title="Hours This Week"
            value={(data.weeklyHours.tutoring + data.weeklyHours.coaching).toFixed(1)}
            subtitle={`T: ${data.weeklyHours.tutoring} | C: ${data.weeklyHours.coaching}`}
        />
        <StatCard
            icon={FiAlertCircle}
            iconBgColor="bg-warning"
            title="Needs Completion"
            value={data.needsCompletion}
            subtitle={`${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'dd/MM/yy')} - ${format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'dd/MM/yy')}`}
        />
        <StatCard
            icon={FiUsers}
            iconBgColor="bg-info"
            title="Students Helped"
            value={data.uniqueStudents}
        />
        {data.needsConfirmation > 0 && (
            <div className="col-12">
                <div className="alert alert-warning mb-0 d-flex align-items-center">
                    <FiAlertCircle className="me-2" size={20} />
                    <span>
                        You have {data.needsConfirmation} event(s) requiring your confirmation
                    </span>
                </div>
            </div>
        )}
    </>
);

const StudentStats = ({ data }) => (
    <>
        <StatCard
            icon={FiCalendar}
            iconBgColor="bg-primary"
            title="Upcoming Sessions"
            value={data.upcomingEventsCount}
        />
        <StatCard
            icon={FiClock}
            iconBgColor="bg-warning"
            title="Pending Requests"
            value={data.pendingRequests}
        />
        <StatCard
            icon={FiCheckCircle}
            iconBgColor="bg-success"
            title="Approved Requests"
            value={data.approvedRequests}
        />
        <StatCard
            icon={FiUsers}
            iconBgColor="bg-info"
            title="Available Tutors"
            value={data.availableTutors}
        />
    </>
);

const StatsCards = ({ userRole, data, onUpdate }) => {
    return (
        <div className="row g-4 mb-4">
            {userRole === 'teacher' && <TeacherStats data={data} onUpdate={onUpdate} />}
            {userRole === 'tutor' && <TutorStats data={data} />}
            {userRole === 'student' && <StudentStats data={data} />}
        </div>
    );
};

export default StatsCards;
