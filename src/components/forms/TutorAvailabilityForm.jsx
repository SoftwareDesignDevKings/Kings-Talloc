'use client';

import React, { useState } from 'react';
import { isAfter, format, isValid } from 'date-fns';
import Select from 'react-select';
import BaseModal from '../modals/BaseModal.jsx';
import { MdAccessTime, MdLocationOn, MdWork } from '@/components/icons';
import { useAppData } from '@/contexts/AppDataContext';
import styles from '@/styles/availabilityForm.module.css';
import {
    updateEventInFirestore,
    createEventInFirestore,
    deleteEventFromFirestore,
} from '@/firestore/firestoreOperations';
import { CalendarEntityType } from '@lib/patterns/calendarStrategy';
import useAlert from '@/hooks/useAlert';

const TutorAvailabilityForm = ({
    mode,
    newAvailability,
    setNewAvailability,
    eventToEdit,
    setShowModal,
    userRole,
    userRoles = [],
}) => {
    const { calendarAvailabilities, setCalendarAvailabilities } = useAppData();
    const { addAlert } = useAlert();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Derive mode flags
    const isView = mode === 'view';
    const isEdit = mode === 'edit';
    const isEditing = isEdit || isView; // for backward compat with existing logic

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setNewAvailability({ ...newAvailability, [name]: val });
    };

    const locationOptions = [
        { value: 'onsite', label: 'Onsite' },
        { value: 'remote', label: 'Remote' },
    ];

    const allRoles = [userRole, ...userRoles].filter(Boolean);
    const workTypeOptions = [
        ...(allRoles.includes('tutor') ? [{ value: 'tutoring', label: 'Tutoring' }] : []),
        ...(allRoles.includes('coach') ? [{ value: 'coaching', label: 'Coaching' }] : []),
        { value: 'work', label: 'Work' },
    ];

    const validateDates = () => {
        const start = new Date(newAvailability.start);
        const end = new Date(newAvailability.end);
        if (!isAfter(end, start)) {
            addAlert('error', 'End date must be after the start date.');
            return false; // Validation failed
        }
        return true; // Validation passed
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const availabilityData = {
            title: newAvailability.title,
            start: new Date(newAvailability.start),
            end: new Date(newAvailability.end),
            tutor: newAvailability.tutor,
            workType: Array.isArray(newAvailability.workType) ? newAvailability.workType : [newAvailability.workType || 'work'],
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
            return true; // Success - allow modal to close
        } catch (error) {
            console.error('Failed to submit availability:', error);
            addAlert('error', 'Failed to submit availability');
            return false; // Error - don't close modal
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
            return true; // Success - allow modal to close
        } catch (error) {
            console.error('Failed to delete availability:', error);
            addAlert('error', 'Failed to delete availability');
            return false; // Error - don't close modal
        }
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return false;
        if (!validateDates()) {
            return false; // Validation failed - don't close modal
        }
        setIsSubmitting(true);
        try {
            return await handleSubmit(e); // Pass through the result
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLocationChange = (selectedOption) => {
        setNewAvailability({ ...newAvailability, locationType: selectedOption.value });
    };

    const handleWorkTypeChange = (selectedOptions) => {
        const values = selectedOptions ? selectedOptions.map(o => o.value) : [];
        setNewAvailability({ ...newAvailability, workType: values });
    };

    const normaliseWorkType = (workType) => {
        if (typeof workType === 'string') {
            if (workType === 'tutoringOrWork') return ['tutoring', 'work'];
            return [workType];
        }
        return workType;
    };

    const getWorkTypeBadge = () => {
        const workTypes = normaliseWorkType(newAvailability.workType);
        const badges = {
            tutoring: <span key="tutoring" className="badge bg-primary me-1">Tutoring</span>,
            coaching: <span key="coaching" className="badge bg-info me-1">Coaching</span>,
            work: <span key="work" className="badge bg-secondary me-1">Work</span>,
        };
        return workTypes.map(type => badges[type] || null);
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
            size="lg"
            onSubmit={isView ? undefined : onSubmit}
            submitText={isEdit ? 'Save Changes' : 'Add Availability'}
            loading={isSubmitting}
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
            <div className={styles.formContainer}>

                {/* Time Selection Section */}
                <div className={styles.section}>
                    <div className={styles.sectionTitle}>
                        <MdAccessTime size={18} className="text-primary" aria-hidden="true" />
                        <span className="fw-bold">Time Period</span>
                    </div>

                    <div className={styles.timeGrid}>
                        <div>
                            <label htmlFor="start" className="form-label small fw-bold text-muted text-uppercase mb-1">
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

                        <div>
                            <label htmlFor="end" className="form-label small fw-bold text-muted text-uppercase mb-1">
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
                    </div>

                </div>

                {/* Work Type & Location Section */}
                <div className={styles.section}>
                    <div className={styles.typeGrid}>
                        <div>
                            <div className={styles.sectionTitle}>
                                <MdWork size={16} className="text-primary" aria-hidden="true" />
                                <span className="fw-bold">Assignment Type</span>
                            </div>
                            <Select
                                isMulti
                                name="workType"
                                options={workTypeOptions}
                                value={workTypeOptions.filter((option) =>
                                    normaliseWorkType(newAvailability.workType).includes(option.value)
                                )}
                                onChange={handleWorkTypeChange}
                                classNamePrefix="select"
                                placeholder="Select types..."
                                isDisabled={isView}
                                aria-label="Work type"
                                inputId="workType"
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        padding: '4px',
                                        borderRadius: '0.5rem',
                                    }),
                                }}
                            />
                        </div>
                        <div>
                            <div className={styles.sectionTitle}>
                                <MdLocationOn size={16} className="text-primary" aria-hidden="true" />
                                <span className="fw-bold">Location Preference</span>
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
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        padding: '4px',
                                        borderRadius: '0.5rem',
                                    }),
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </BaseModal>
    );
};

export default TutorAvailabilityForm;
