import { workCategory } from '@/lib/scheduling/eventRules';
import React, { useCallback } from 'react';
import Select from 'react-select';
import { MdSettings } from '@/components/icons';

const SettingsSection = ({
    newEvent,
    setNewEvent,
    onWorkTypeChange,
    workTypeOptions,
    workStatusOptions,
    readOnly,
    userRole,
}) => {
    // memoised handlers for Select components
    const handleWorkTypeChange = useCallback((selectedOption) => {
        onWorkTypeChange(selectedOption.value);
    }, [onWorkTypeChange]);

    const handleWorkStatusChange = useCallback((selectedOption) => {
        setNewEvent((prev) => ({
            ...prev,
            workStatus: selectedOption.value,
        }));
    }, [setNewEvent]);
    return (
        <div className="accordion-item">
            <h2 className="accordion-header">
                <button
                    className="accordion-button collapsed shadow-none"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#settings"
                    aria-expanded="false"
                    aria-controls="settings"
                >
                    <MdSettings className="me-2 text-primary" size={20} aria-hidden="true" />
                    <span className="fw-bold">Settings & Status</span>
                </button>
            </h2>
            <div
                id="settings"
                className="accordion-collapse collapse"
                data-bs-parent="#eventFormAccordion"
            >
                <div className="accordion-body p-4">
                    <div className="row g-4">
                        <div className="col-md-6">
                            <label htmlFor="workType" className="form-label small fw-bold text-muted text-uppercase">
                                Work Type
                            </label>
                            <Select
                                name="workType"
                                options={workTypeOptions}
                                onChange={handleWorkTypeChange}
                                classNamePrefix="select"
                                value={workTypeOptions.find(
                                    (option) => option.value === workCategory(newEvent),
                                )}
                                isDisabled={readOnly}
                                aria-label="Event work type"
                                inputId="workType"
                            />
                        </div>

                        <div className="col-md-6">
                            <label htmlFor="workStatus" className="form-label small fw-bold text-muted text-uppercase">
                                Work Status
                            </label>
                            <Select
                                name="workStatus"
                                options={workStatusOptions}
                                onChange={handleWorkStatusChange}
                                classNamePrefix="select"
                                value={workStatusOptions.find(
                                    (option) =>
                                        option.value === (newEvent.workStatus || 'notCompleted'),
                                )}
                                isDisabled={readOnly && userRole !== 'tutor' && userRole !== 'coach'}
                                aria-label="Event work status"
                                inputId="workStatus"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(SettingsSection);
