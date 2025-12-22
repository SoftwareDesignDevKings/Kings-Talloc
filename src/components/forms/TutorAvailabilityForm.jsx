'use client';

import React, { useState } from 'react';
import { isAfter, add, format, isValid } from 'date-fns';
import Select from 'react-select';
import BaseModal from '../modals/BaseModal.jsx';
import { MdAccessTime, MdLocationOn, MdWork } from '@/components/icons';
import { useCalendarData } from '@/providers/CalendarDataProvider';
import {
    updateEventInFirestore,
    createEventInFirestore,
    deleteEventFromFirestore,
} from '@/firestore/firestoreOperations';
import { CalendarEntityType } from '@/strategy/calendarStrategy';

const TutorAvailabilityForm = ({
    mode,
    newAvailability,
    setNewAvailability,
    eventToEdit,
    setShowModal,
}) => {
    const { calendarAvailabilities, setCalendarAvailabilities } = useCalendarData();
    // Derive mode flags
    const isView = mode === 'view';
    const isEdit = mode === 'edit';
    const isEditing = isEdit || isView; // for backward compat with existing logic

    const [error, setError] = useState('');

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setNewAvailability({ ...newAvailability, [name]: val });
    };

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

    const handleSubmit = async (e) => {
        e.preventDefault();

        const availabilityData = {
            title: newAvailability.title,
            start: new Date(newAvailability.start),
            end: new Date(newAvailability.end),
            tutor: newAvailability.tutor,
            workType: newAvailability.workType,
            locationType: newAvailability.locationType,
        };

        try {
            if (isEditing) {
                await updateEventInFirestore(eventToEdit.id, availabilityData, 'tutorAvailabilities');
                setCalendarAvailabilities(
                    calendarAvailabilities.map((availability) =>
                        availability.id === eventToEdit.id
                            ? {
                                ...availabilityData,
                                id: eventToEdit.id,
                                entityType: CalendarEntityType.AVAILABILITY
                            }
                            : availability,
                    ),
                );
            } else {
                const docId = await createEventInFirestore(
                    availabilityData,
                    'tutorAvailabilities',
                );
                setCalendarAvailabilities([
                    ...calendarAvailabilities,
                    {
                        ...availabilityData,
                        id: docId,
                        entityType: CalendarEntityType.AVAILABILITY
                    },
                ]);
            }
            setShowModal(false);
        } catch (error) {
            console.error('Failed to submit availability:', error);
            setError('Failed to submit availability');
        }
    };

    const handleDelete = async () => {
        try {
            await deleteEventFromFirestore(eventToEdit.id, 'tutorAvailabilities');
            setCalendarAvailabilities(
                calendarAvailabilities.filter(
                    (availability) => availability.id !== eventToEdit.id,
                ),
            );
            setShowModal(false);
        } catch (error) {
            console.error('Failed to delete availability:', error);
            setError('Failed to delete availability');
        }
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (validateDates()) {
            await handleSubmit(e);
        }
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
            title={isView ? 'Availability Details' : (isEdit ? 'Edit Availability' : 'Add Availability')}
            size="md"
            onSubmit={isView ? undefined : onSubmit}
            submitText={isEdit ? 'Save Changes' : 'Add Availability'}
            deleteButton={
                isEdit
                    ? {
                          text: 'Delete',
                          onClick: handleDelete,
                          variant: 'danger',
                      }
                    : null
            }
            showFooter={!isView}
        >
            {error && <div className="alert alert-danger mb-3 py-2" role="alert" aria-live="polite">{error}</div>}

            {/* Time Selection Card */}
            <div className="card mb-3" style={{ borderWidth: '2px', borderColor: '#dee2e6', borderStyle: 'solid' }}>
                <div className="card-body p-3">
                    <div className="d-flex align-items-center mb-2">
                        <MdAccessTime className="me-2 text-secondary" size={18} aria-hidden="true" />
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
                            disabled={isView}
                            aria-label="Availability start time"
                            aria-required="true"
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
                            disabled={isView}
                            aria-label="Availability end time"
                            aria-required="true"
                        />
                    </div>

                    {!isView && (
                        <div className="d-flex gap-2 align-items-center mt-3">
                            <small className="text-muted" id="quick-duration-label">Quick:</small>
                            <div className="btn-group btn-group-sm" role="group" aria-labelledby="quick-duration-label">
                                <button
                                    type="button"
                                    className="btn btn-outline-primary"
                                    onClick={() => setHours(6)}
                                    aria-label="Set duration to 6 hours"
                                >
                                    6hrs
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setHours(3)}
                                    aria-label="Set duration to 3 hours"
                                >
                                    3hrs
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Work Type & Location */}
            <div className="row g-2">
                <div className="col-6">
                    <div className="card h-100" style={{ borderWidth: '2px', borderColor: '#dee2e6', borderStyle: 'solid' }}>
                        <div className="card-body p-2">
                            <div className="d-flex align-items-center mb-2">
                                <MdWork className="me-1 text-secondary" size={16} aria-hidden="true" />
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
                                isDisabled={isView}
                                aria-label="Work type"
                                inputId="workType"
                            />
                        </div>
                    </div>
                </div>
                <div className="col-6">
                    <div className="card h-100" style={{ borderWidth: '2px', borderColor: '#dee2e6', borderStyle: 'solid' }}>
                        <div className="card-body p-2">
                            <div className="d-flex align-items-center mb-2">
                                <MdLocationOn className="me-1 text-secondary" size={16} aria-hidden="true" />
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
                                isDisabled={isView}
                                aria-label="Location type"
                                inputId="locationType"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </BaseModal>
    );
};

export default TutorAvailabilityForm;
