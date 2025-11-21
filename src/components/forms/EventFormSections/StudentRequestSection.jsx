import React from 'react';
import Select from 'react-select';
import { MdNoteAlt, MdMenuBook, MdFlag } from '@/components/icons';

const StudentRequestSection = ({
    newEvent,
    handleApprovalChange,
    approvalOptions,
    readOnly,
}) => {
    if (!newEvent.createdByStudent) return null;

    return (
        <div className="accordion-item">
            <h2 className="accordion-header">
                <button
                    className="accordion-button collapsed"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#studentRequest"
                    aria-expanded="false"
                    aria-controls="studentRequest"
                >
                    <MdNoteAlt className="me-2" aria-hidden="true" /> Student Request
                </button>
            </h2>
            <div
                id="studentRequest"
                className="accordion-collapse collapse"
                data-bs-parent="#eventFormAccordion"
            >
                <div className="accordion-body">
                    {newEvent.subject && (
                        <div className="mb-2">
                            <small className="text-muted d-block mb-1 d-flex align-items-center gap-1">
                                <MdMenuBook /> Subject
                            </small>
                            <span className="badge bg-secondary fw-normal">
                                {newEvent.subject.label || newEvent.subject}
                            </span>
                        </div>
                    )}

                    {newEvent.preference && (
                        <div className="mb-3">
                            <small className="text-muted d-block mb-1 d-flex align-items-center gap-1">
                                <MdFlag /> Preference
                            </small>
                            <span className="badge bg-primary fw-normal">
                                {newEvent.preference}
                            </span>
                        </div>
                    )}

                    <div className="mb-0">
                        <label
                            htmlFor="approvalStatus"
                            className="form-label small text-muted mb-1"
                        >
                            Approval Status
                        </label>
                        <Select
                            name="approvalStatus"
                            options={approvalOptions}
                            onChange={handleApprovalChange}
                            classNamePrefix="select"
                            defaultValue={
                                newEvent.approvalStatus === 'approved'
                                    ? { value: 'approved', label: 'Approve' }
                                    : newEvent.approvalStatus === 'denied'
                                      ? { value: 'denied', label: 'Deny' }
                                      : null
                            }
                            isDisabled={readOnly}
                            aria-label="Student request approval status"
                            inputId="approvalStatus"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentRequestSection;
