import React, { useState, useEffect, useRef } from 'react';
import { FiClock, FiChevronDown } from '@/components/icons';
import { useApprovalHandlers } from '@/hooks/useApprovalHandlers';
import { useRequestNotifications } from '@/contexts/RequestNotificationsContext';
import PendingApprovalItem from './PendingApprovalItem';

const PendingApprovalsCard = ({ count, pendingRequests, onUpdate, readOnly = false, colClass = 'col-12 col-md-4 col-lg-3' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const cardRef = useRef(null);
    const notifications = useRequestNotifications();
    const useGlobalRequests = notifications.available && (!readOnly || notifications.enabled);
    const displayedRequests = useGlobalRequests ? notifications.pendingRequests : pendingRequests;
    const displayedCount = useGlobalRequests ? (notifications.hasData ? notifications.count : '…') : (count || 0);
    const { handleApprove, handleReject, handleDelete, processingIds } = useApprovalHandlers(onUpdate);

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
        <div ref={cardRef} id={useGlobalRequests ? 'pending-approvals' : undefined} className={`${colClass} fade`}>
            <div ref={dropdownRef} className="position-relative h-100">
                <div
                    className="card border-0 shadow-sm h-100"
                    role="button"
                    tabIndex={0}
                    onClick={() => setIsOpen(!isOpen)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setIsOpen(value => !value);
                        }
                    }}
                    aria-expanded={isOpen}
                >
                    <div className="card-body d-flex align-items-center">
                        <div className="d-flex align-items-center w-100">
                            <div className="flex-shrink-0">
                                <div className="bg-warning bg-opacity-10 rounded p-3">
                                    <FiClock className="text-warning" size={24} />
                                </div>
                            </div>
                            <div className="flex-grow-1 ms-3">
                                <h6 className="text-muted mb-1 small">Pending Approvals</h6>
                                <h3 className="mb-0 fw-bold">{displayedCount}</h3>
                            </div>
                            <FiChevronDown className="text-muted ms-2" />
                        </div>
                    </div>
                </div>

                {useGlobalRequests && notifications.error && (
                    <div className="small text-muted mt-2" role="status">
                        {notifications.error}{' '}
                        <button type="button" className="btn btn-link btn-sm p-0" onClick={notifications.retry}>Retry</button>
                    </div>
                )}

                {isOpen && (
                    <div className="position-absolute top-100 start-0 w-100 mt-2 bg-white border rounded shadow-lg overflow-auto" style={{zIndex: 1050, maxHeight: '400px'}}>
                        {useGlobalRequests && !notifications.ready && (
                            <div className="p-3 small text-muted" role="status">
                                {notifications.error || 'Loading requests…'}
                            </div>
                        )}
                        {(!displayedRequests || displayedRequests.length === 0) && !(useGlobalRequests && !notifications.ready) ? (
                            <div className="p-4 text-center text-muted">
                                <div className="small">No pending approvals</div>
                            </div>
                        ) : (
                            <div className="list-group list-group-flush">
                                {displayedRequests?.map((request) => (
                                    <PendingApprovalItem
                                        key={request.id}
                                        request={request}
                                        onApprove={handleApprove}
                                        onReject={handleReject}
                                        onDelete={handleDelete}
                                        readOnly={readOnly}
                                        disabled={(useGlobalRequests && !notifications.ready) || processingIds.has(request.id)}
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
