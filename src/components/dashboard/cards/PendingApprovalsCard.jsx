import React, { useState, useEffect, useRef } from 'react';
import { FiClock, FiChevronDown } from '@/components/icons';
import { useApprovalHandlers } from '@/hooks/useApprovalHandlers';
import { useAppData } from '@/contexts/AppDataContext';
import PendingApprovalItem from './PendingApprovalItem';

const PendingApprovalsCard = ({ count, pendingRequests, onUpdate, readOnly = false, colClass = 'col-12 col-md-4 col-lg-3' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const cardRef = useRef(null);
    const { calendarShifts } = useAppData();
    const { handleApprove, handleReject, handleDelete } = useApprovalHandlers(onUpdate, calendarShifts);

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
        <div ref={cardRef} className={`${colClass} fade`}>
            <div ref={dropdownRef} className="position-relative h-100">
                <div
                    className="card border-0 shadow-sm h-100"
                    role="button"
                    onClick={() => setIsOpen(!isOpen)}
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
