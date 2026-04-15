import React from 'react';
import Select from 'react-select';
import { MdNoteAlt, MdMenuBook, MdFlag, MdSchool } from '@/components/icons';

const StudentRequestSection = ({
    newEvent,
    handleApprovalChange,
    approvalOptions,
    readOnly,
}) => {
    if (!newEvent.createdByStudent) return null;

    // Auto-expand for student requests (when opened by teacher)
    const isExpanded = true;

    return (
        <div className="accordion-item border-0">
            <h2 className="accordion-header">
                <button
                    className={`accordion-button shadow-none ${isExpanded ? '' : 'collapsed'}`}
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#studentRequest"
                    aria-expanded={isExpanded}
                    aria-controls="studentRequest"
                >
                    <div className="d-flex align-items-center justify-content-between w-100 me-3">
                        <div className="d-flex align-items-center">
                            <MdNoteAlt className="me-2 text-primary" size={20} aria-hidden="true" />
                            <span className="fw-bold">Student Request Details</span>
                        </div>
                        <span className="badge rounded-pill bg-info fw-normal text-xs">STUDENT SUBMITTED</span>
                    </div>
                </button>
            </h2>
            <div
                id="studentRequest"
                className={`accordion-collapse collapse ${isExpanded ? 'show' : ''}`}
                data-bs-parent="#eventFormAccordion"
            >
                <div className="accordion-body p-4">
                    <div className="p-3 bg-light rounded mb-4">
                        <div className="row g-3">
                            {newEvent.subject && (
                                <div className="col-6 border-end">
                                    <label className="form-label small fw-bold text-muted text-uppercase d-flex align-items-center gap-1 mb-1">
                                        <MdMenuBook /> Subject
                                    </label>
                                    <div className="fw-bold text-primary">
                                        {newEvent.subject.label || newEvent.subject}
                                    </div>
                                </div>
                            )}

                            {newEvent.preference && (
                                <div className="col-6">
                                    <label className="form-label small fw-bold text-muted text-uppercase d-flex align-items-center gap-1 mb-1">
                                        <MdFlag /> Preference
                                    </label>
                                    <div className="fw-bold text-dark">
                                        {newEvent.preference}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {!readOnly && (
                        <div className="pt-3 border-top">
                            <label
                                htmlFor="approvalStatus"
                                className="form-label small fw-bold text-muted text-uppercase mb-2"
                            >
                                Administrative Decision
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
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        backgroundColor: '#fff',
                                        borderColor: '#dee2e6',
                                        borderRadius: '0.5rem',
                                        padding: '2px',
                                    }),
                                }}
                            />
                            <div className="mt-2 text-muted text-xs">
                                <MdSchool className="me-1" /> 
                                Approving this request will automatically schedule the session and notify the student.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentRequestSection;
