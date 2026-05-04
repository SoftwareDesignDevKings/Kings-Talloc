import React, { useState, useEffect, useRef } from 'react';
import { FiClock, FiChevronDown } from '@/components/icons';
import { useApprovalHandlers } from '@/hooks/useApprovalHandlers';
import PendingApprovalItem from './PendingApprovalItem';
import styled from 'styled-components';

const DropdownPanel = styled.div`
    z-index: 1050;
    max-height: 400px;
`;

const PendingApprovalsCard = ({ count, pendingRequests, onUpdate, readOnly = false, colClass = 'col-12 col-md-4 col-lg-3', delay = 150 }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const cardRef = useRef(null);
    const { handleApprove, handleReject, handleDelete } = useApprovalHandlers(onUpdate);
    const dropdownContentId = 'pending-approvals-dropdown-content';

    // Fade in card with configurable delay
    useEffect(() => {
        if (cardRef.current) {
            const timer = setTimeout(() => {
                cardRef.current.classList.add('show');
            }, delay);
            return () => clearTimeout(timer);
        }
    }, [delay]);

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
        <div ref={cardRef} className={colClass}>
            <div ref={dropdownRef} className="position-relative h-100">
                <div
                    className="card border-0 shadow-sm h-100 fade"
                    role="button"
                    tabIndex={0}
                    onClick={() => setIsOpen(!isOpen)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setIsOpen(!isOpen);
                        }
                    }}
                    aria-expanded={isOpen}
                    aria-controls={dropdownContentId}
                    aria-label="Toggle pending approvals dropdown"
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
                    <DropdownPanel id={dropdownContentId} className="position-absolute top-100 start-0 w-100 mt-2 bg-white border rounded shadow-lg overflow-auto">
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
                    </DropdownPanel>
                )}
            </div>
        </div>
    );
};

export default PendingApprovalsCard;
