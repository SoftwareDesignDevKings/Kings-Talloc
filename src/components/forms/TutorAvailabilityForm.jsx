'use client';

import React, { useState } from 'react';
import { isAfter, add, format, isValid } from 'date-fns';
import Select from 'react-select';
import BaseModal from '../modals/BaseModal.jsx';
import { MdAccessTime, MdLocationOn, MdWork } from '@/components/icons';

const TutorAvailabilityForm = ({
    isEditing,
    newAvailability,
    setNewAvailability,
    handleInputChange,
    handleSubmit,
    handleDelete,
    setShowModal,
}) => {
    const [error, setError] = useState('');

    const locationOptions = [
        { value: 'onsite', label: 'Onsite' },
        { value: 'remote', label: 'Remote' },
    ];

    const workTypeOptions = [
        { value: 'tutoring', label: 'Tutoring' },
        { value: 'coaching', label: 'Coaching' },
        { value: 'tutoringOrWork', label: 'Tutoring Or Work' },
        { value: 'work', label: 'Work' },
    ];

    const validateDates = () => {
        const start = new Date(newAvailability.start);
        const end = new Date(newAvailability.end);
        if (!isAfter(end, start)) {
            setError('End date must be after the start date.');
            return false;
        }
        setError('');
        return true;
    };

    const setHours = (hours) => {
        if (newAvailability.start) {
            const newEnd = add(new Date(newAvailability.start), { hours });
            setNewAvailability({ ...newAvailability, end: newEnd.toISOString() });
        } else {
            setError('Invalid hours');
        }
    };
    const onSubmit = async (e) => {
        e.preventDefault();
        if (validateDates()) {
            handleSubmit(e);
        }

        // await fetch("/api/send-event", {
        //   method: "POST",
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify({
        //     subject: "Math Tutoring - Year 10",
        //     start: "2025-09-17T14:00:00",
        //     end: "2025-09-17T15:00:00",
        //     attendees: ["mmei@kings.edu.au", "vpatel@kings.edu.au", "eqsu@kings.edu.au"],
        //   }),
        // });
    };

    const handleLocationChange = (selectedOption) => {
        setNewAvailability({ ...newAvailability, locationType: selectedOption.value });
    };

    const handleWorkTypeChange = async (selectedOption) => {
        setNewAvailability({ ...newAvailability, workType: selectedOption.value });
    };

    const getWorkTypeBadge = () => {
        const workType = newAvailability.workType;
        const badges = {
            tutoring: <span className="badge bg-primary me-1">Tutoring</span>,
            coaching: <span className="badge bg-info me-1">Coaching</span>,
            tutoringOrWork: <span className="badge bg-success me-1">Tutoring/Work</span>,
            work: <span className="badge bg-secondary me-1">Work</span>,
        };
        return badges[workType] || null;
    };

    const getLocationBadge = () => {
        const location = newAvailability.locationType;
        if (location === 'onsite') return <span className="badge bg-success">🏫 Onsite</span>;
        if (location === 'remote') return <span className="badge bg-info">💻 Remote</span>;
        return null;
    };

    return (
        <BaseModal
            show={true}
            onHide={() => setShowModal(false)}
            title={isEditing ? 'Edit Availability' : 'Add Availability'}
            size="md"
            onSubmit={onSubmit}
            submitText={isEditing ? 'Save Changes' : 'Add Availability'}
            deleteButton={
                isEditing
                    ? {
                          text: 'Delete',
                          onClick: handleDelete,
                          variant: 'danger',
                      }
                    : null
            }
        >
            {error && <div className="alert alert-danger mb-3 py-2">{error}</div>}

            {/* Summary badges */}
            {(newAvailability.workType || newAvailability.locationType) && (
                <div className="mb-3 pb-2 border-bottom">
                    {getWorkTypeBadge()}
                    {getLocationBadge()}
                </div>
            )}

            {/* Time Selection Card */}
            <div className="card mb-3 border-primary" style={{ borderWidth: '2px' }}>
                <div className="card-body p-3">
                    <div className="d-flex align-items-center mb-2">
                        <MdAccessTime className="me-2 text-primary" size={18} />
                        <small className="text-muted fw-semibold">Time Period</small>
                    </div>

                    <div className="mb-2">
                        <label htmlFor="start" className="form-label small text-muted mb-1">
                            Start Time
                        </label>
                        <input
                            type="datetime-local"
                            className="form-control"
                            name="start"
                            id="start"
                            value={
                                newAvailability.start && isValid(new Date(newAvailability.start))
                                    ? format(new Date(newAvailability.start), "yyyy-MM-dd'T'HH:mm")
                                    : ''
                            }
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="mb-2">
                        <label htmlFor="end" className="form-label small text-muted mb-1">
                            End Time
                        </label>
                        <input
                            type="datetime-local"
                            className="form-control"
                            name="end"
                            id="end"
                            value={
                                newAvailability.end && isValid(new Date(newAvailability.end))
                                    ? format(new Date(newAvailability.end), "yyyy-MM-dd'T'HH:mm")
                                    : ''
                            }
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="d-flex gap-2 align-items-center">
                        <small className="text-muted">Quick:</small>
                        <div className="btn-group btn-group-sm" role="group">
                            <button
                                type="button"
                                className="btn btn-outline-primary"
                                onClick={() => setHours(6)}
                            >
                                6hrs
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => setHours(3)}
                            >
                                3hrs
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Work Type & Location */}
            <div className="row g-2">
                <div className="col-6">
                    <div className="card h-100 border-info" style={{ borderWidth: '2px' }}>
                        <div className="card-body p-2">
                            <div className="d-flex align-items-center mb-2">
                                <MdWork className="me-1 text-info" size={16} />
                                <small className="text-muted fw-semibold">Type</small>
                            </div>
                            <Select
                                name="workType"
                                options={workTypeOptions}
                                value={workTypeOptions.find(
                                    (option) => option.value === newAvailability.workType,
                                )}
                                onChange={handleWorkTypeChange}
                                classNamePrefix="select"
                                placeholder="Select type..."
                            />
                        </div>
                    </div>
                </div>
                <div className="col-6">
                    <div className="card h-100 border-success" style={{ borderWidth: '2px' }}>
                        <div className="card-body p-2">
                            <div className="d-flex align-items-center mb-2">
                                <MdLocationOn className="me-1 text-success" size={16} />
                                <small className="text-muted fw-semibold">Location</small>
                            </div>
                            <Select
                                name="locationType"
                                options={locationOptions}
                                value={locationOptions.find(
                                    (option) => option.value === newAvailability.locationType,
                                )}
                                onChange={handleLocationChange}
                                classNamePrefix="select"
                                placeholder="Select location..."
                                required
                            />
                        </div>
                    </div>
                </div>
            </div>
        </BaseModal>
    );
};

export default TutorAvailabilityForm;
