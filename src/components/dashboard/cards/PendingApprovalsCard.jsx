import React, { useState, useEffect, useRef } from 'react';
import { FiClock, FiChevronDown } from '@/components/icons';
import { format } from 'date-fns';
import { useApprovalHandlers } from '@/hooks/useApprovalHandlers';

const PendingApprovalItem = ({ request, onApprove, onReject, onDelete, readOnly }) => (
    <div className="list-group-item">
        <div className="d-flex flex-column gap-2">
            <div>
                <div className="fw-semibold">
                    {request.title || 'Untitled Request'}
                </div>
                <div className="small text-muted mt-1">
                    {request.students && request.students.length > 0 && (
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
                    {format(request.start, 'MMM d, yyyy h:mm a')}{' '}
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

            {!readOnly && (
                <div className="d-flex gap-2">
                    <button
                        className="btn btn-sm btn-success"
                        onClick={(e) => { e.stopPropagation(); onApprove(request); }}
                    >
                        Approve
                    </button>
                    <button
                        className="btn btn-sm btn-secondary"
                        onClick={(e) => { e.stopPropagation(); onReject(request.id); }}
                    >
                        Reject
                    </button>
                    <button
                        className="btn btn-sm btn-danger"
                        onClick={(e) => { e.stopPropagation(); onDelete(request.id); }}
                    >
                        Delete
                    </button>
                </div>
            )}
        </div>
    </div>
);

const PendingApprovalsCard = ({ count, pendingRequests, onUpdate, readOnly = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const cardRef = useRef(null);
    const { handleApprove, handleReject, handleDelete } = useApprovalHandlers(onUpdate);

    // Fade in card with delay
    useEffect(() => {
        if (cardRef.current) {
            const timer = setTimeout(() => {
                cardRef.current.classList.add('show');
            }, 150);
            return () => clearTimeout(timer);
        }
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div ref={cardRef} className="col-12 col-md-4 col-lg-3 fade">
            <div ref={dropdownRef} className="position-relative">
                <div
                    className="card border-0 shadow-sm"
                    role="button"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-expanded={isOpen}
                >
                    <div className="card-body">
                        <div className="d-flex align-items-center">
                            <div className="flex-shrink-0">
                                <div className="bg-warning bg-opacity-10 rounded p-3">
                                    <FiClock className="text-warning" size={24} />
                                </div>
                            </div>
                            <div className="flex-grow-1 ms-3">
                                <h6 className="text-muted mb-1 small">Pending Approvals</h6>
                                <h3 className="mb-0 fw-bold">{count || 0}</h3>
                            </div>
                            <FiChevronDown className="text-muted ms-2" />
                        </div>
                    </div>
                </div>

                {isOpen && (
                    <div className="position-absolute top-100 start-0 w-100 mt-2 bg-white border rounded shadow-lg overflow-auto" style={{zIndex: 1050, maxHeight: '400px'}}>
                        {!pendingRequests || pendingRequests.length === 0 ? (
                            <div className="p-4 text-center text-muted">
                                <div className="small">No pending approvals</div>
                            </div>
                        ) : (
                            <div className="list-group list-group-flush">
                                {pendingRequests.map((request) => (
                                    <PendingApprovalItem
                                        key={request.id}
                                        request={request}
                                        onApprove={handleApprove}
                                        onReject={handleReject}
                                        onDelete={handleDelete}
                                        readOnly={readOnly}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PendingApprovalsCard;
