import React, { useState } from 'react';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firestore/firestoreClient.js';
import { format } from 'date-fns';

const PendingApprovals = ({ pendingRequestsData, onUpdate }) => {
    const [showDropdown, setShowDropdown] = useState(false);

    const handleApproveRequest = async (requestId) => {
        try {
            const requestRef = doc(db, 'studentEventRequests', requestId);
            await updateDoc(requestRef, {
                approvalStatus: 'approved',
                approvedAt: new Date(),
            });
            onUpdate();
        } catch (error) {
            console.error('Error approving request:', error);
        }
    };

    const handleRejectRequest = async (requestId) => {
        try {
            const requestRef = doc(db, 'studentEventRequests', requestId);
            await updateDoc(requestRef, {
                approvalStatus: 'rejected',
                rejectedAt: new Date(),
            });
            onUpdate();
        } catch (error) {
            console.error('Error rejecting request:', error);
        }
    };

    const handleDeleteRequest = async (requestId) => {
        try {
            const requestRef = doc(db, 'studentEventRequests', requestId);
            await deleteDoc(requestRef);
            onUpdate();
        } catch (error) {
            console.error('Error deleting request:', error);
        }
    };

    if (!pendingRequestsData || pendingRequestsData.length === 0) {
        return null;
    }

    return (
        <div className="position-relative">
            {showDropdown && (
                <div
                    className="position-absolute top-100 start-0 w-100 mt-2 bg-white border rounded shadow-lg"
                    style={{ zIndex: 1050, maxHeight: '400px', overflowY: 'auto' }}
                >
                    {pendingRequestsData.length === 0 ? (
                        <div className="p-4 text-center text-muted">
                            <div className="small">No pending approvals</div>
                        </div>
                    ) : (
                        <div className="list-group list-group-flush">
                            {pendingRequestsData.map((request) => (
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
                                                                .map((s) => s.label || s.value)
                                                                .join(', ')}
                                                        </div>
                                                    )}
                                                {request.staff && request.staff.length > 0 && (
                                                    <div>
                                                        <strong>Tutor:</strong>{' '}
                                                        {request.staff
                                                            .map((t) => t.label || t.value)
                                                            .join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="small text-muted">
                                            <div>
                                                {format(request.start, 'MMM d, yyyy h:mm a')} -{' '}
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
    );
};

export default PendingApprovals;
