import React from 'react';
import Select from 'react-select';
import { MdSettings } from '@/components/icons';

const SettingsSection = ({
    newEvent,
    setNewEvent,
    handleMinStudentsChange,
    workTypeOptions,
    workStatusOptions,
    readOnly,
}) => {
    return (
        <div className="accordion-item">
            <h2 className="accordion-header">
                <button
                    className="accordion-button collapsed"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#settings"
                    aria-expanded="false"
                    aria-controls="settings"
                >
                    <MdSettings className="me-2" aria-hidden="true" /> Settings & Status
                </button>
            </h2>
            <div
                id="settings"
                className="accordion-collapse collapse"
                data-bs-parent="#eventFormAccordion"
            >
                <div className="accordion-body">
                    <div className="mb-3">
                        <label
                            htmlFor="minStudents"
                            className="form-label small text-muted mb-1"
                        >
                            Minimum Students Required
                        </label>
                        <input
                            type="number"
                            className="form-control"
                            name="minStudents"
                            id="minStudents"
                            value={newEvent.minStudents || 0}
                            onChange={handleMinStudentsChange}
                            disabled={readOnly}
                            aria-label="Minimum number of students required"
                            min="0"
                        />
                    </div>

                    {newEvent.minStudents > 0 && (
                        <div className="mb-3">
                            <small className="text-muted d-block mb-2">Student Responses</small>
                            {newEvent.studentResponses && newEvent.studentResponses.length > 0 ? (
                                <div className="d-flex flex-wrap gap-1">
                                    {newEvent.studentResponses.map((response, index) => (
                                        <span
                                            key={index}
                                            className={`badge bg-${response.response ? 'success' : 'danger'} fw-normal`}
                                        >
                                            {response.email}:{' '}
                                            {response.response ? 'Accepted' : 'Declined'}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted mb-0 small fst-italic">
                                    No responses yet
                                </p>
                            )}
                        </div>
                    )}

                    <div className="mb-3">
                        <label htmlFor="workType" className="form-label small text-muted mb-1">
                            Work Type
                        </label>
                        <Select
                            name="workType"
                            options={workTypeOptions}
                            onChange={(selectedOption) =>
                                setNewEvent({
                                    ...newEvent,
                                    workType: selectedOption.value,
                                })
                            }
                            classNamePrefix="select"
                            value={workTypeOptions.find(
                                (option) => option.value === (newEvent.workType || 'tutoring'),
                            )}
                            isDisabled={readOnly}
                            aria-label="Event work type"
                            inputId="workType"
                        />
                    </div>

                    <div className="mb-0">
                        <label htmlFor="workStatus" className="form-label small text-muted mb-1">
                            Work Status
                        </label>
                        <Select
                            name="workStatus"
                            options={workStatusOptions}
                            onChange={(selectedOption) =>
                                setNewEvent({
                                    ...newEvent,
                                    workStatus: selectedOption.value,
                                })
                            }
                            classNamePrefix="select"
                            value={workStatusOptions.find(
                                (option) =>
                                    option.value === (newEvent.workStatus || 'notCompleted'),
                            )}
                            isDisabled={readOnly}
                            aria-label="Event work status"
                            inputId="workStatus"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsSection;
