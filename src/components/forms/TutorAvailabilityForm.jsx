'use client';

import React, { useState, useRef, useId, useMemo } from 'react';
import { isAfter } from 'date-fns';
import { CalendarDateTime } from '@internationalized/date';
import { Clock, MarkerPin01, XClose } from '@untitledui/icons';
import { Dialog, Modal, ModalOverlay } from '@/components/untitled/modal';
import { Button } from '@/components/untitled/button';
import { DateTimePicker } from '@/components/untitled/date-time-picker';
import { Select } from '@/components/untitled/select';
import { useAppData } from '@/contexts/AppDataContext';
import styles from '@/styles/availabilityForm.module.css';
import {
    updateEventInFirestore,
    createEventInFirestore,
    deleteEventFromFirestore,
} from '@/firestore/firestoreOperations';
import { normaliseWorkType } from '@/utils/calendarAvailability';
import useAlert from '@/hooks/useAlert';

const pickerValue = raw => {
    const date = new Date(raw);
    return raw && !Number.isNaN(date.getTime())
        ? new CalendarDateTime(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()) : null;
};

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
    const busyRef = useRef(false);
    const [portalContainer, setPortalContainer] = useState(null);
    const [dateMenuOpen, setDateMenuOpen] = useState(false);
    const dateTimeValidity = useRef({ start: true, end: true });
    const startValue = useMemo(() => pickerValue(newAvailability.start), [newAvailability.start]);
    const endValue = useMemo(() => pickerValue(newAvailability.end), [newAvailability.end]);
    const titleId = useId();

    // Derive mode flags
    const isView = mode === 'view';
    const isEdit = mode === 'edit';
    const isEditing = isEdit || isView; // for backward compat with existing logic

    const locationOptions = [
        { value: 'onsite', label: 'Onsite' },
        { value: 'remote', label: 'Remote' },
    ];

    const validateDates = () => {
        const start = new Date(newAvailability.start);
        const end = new Date(newAvailability.end);
        if (!dateTimeValidity.current.start || !dateTimeValidity.current.end || !isAfter(end, start)) {
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
            workType: isEditing ? normaliseWorkType(eventToEdit.workType) : [userRole === 'coach' ? 'coaching' : 'work'],
            locationType: newAvailability.locationType,
        };

        try {
            if (isEditing) {
                await updateEventInFirestore(eventToEdit.id, availabilityData, 'tutorAvailabilities', eventToEdit.revision || 0);
            } else {
                await createEventInFirestore(availabilityData, 'tutorAvailabilities');
            }
            // Use the live snapshot, which includes the server revision. Replacing
            // it with an optimistic draft can make an immediate edit look stale.
            return true; // Success - allow modal to close
        } catch (error) {
            console.error('Failed to submit availability:', error);
            addAlert('error', `Failed to submit availability: ${error.message}`);
            return false; // Error - don't close modal
        }
    };

    const handleDelete = async () => {
        const availabilityDocId = eventToEdit.originalAvailabilityId || eventToEdit.id;
        try {
            await deleteEventFromFirestore(availabilityDocId, 'tutorAvailabilities');
            setCalendarAvailabilities(
                calendarAvailabilities.filter(
                    (availability) => availability.id !== availabilityDocId,
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
        if (busyRef.current || isView) return false;
        if (!validateDates()) {
            return false; // Validation failed - don't close modal
        }
        busyRef.current = true;
        setIsSubmitting(true);
        try {
            return await handleSubmit(e); // Pass through the result
        } finally {
            busyRef.current = false;
            setIsSubmitting(false);
        }
    };

    const handleLocationChange = (selectedOption) => {
        setNewAvailability({ ...newAvailability, locationType: selectedOption.value });
    };

    const closeModal = () => {
        if (!busyRef.current) setShowModal(false);
    };

    const deleteAvailability = async () => {
        if (busyRef.current || !isEdit || !window.confirm('Delete this availability? Students will no longer be able to book this time unless a Work shift or other availability covers it. Existing approved sessions will remain. This cannot be undone.')) return;
        busyRef.current = true;
        setIsSubmitting(true);
        try {
            if (await handleDelete()) setShowModal(false);
        } finally {
            busyRef.current = false;
            setIsSubmitting(false);
        }
    };

    const submitAvailability = async event => {
        if (await onSubmit(event)) setShowModal(false);
    };

    const title = isView ? 'Availability Details' : (isEdit ? 'Edit Availability' : 'Add Availability');
    const disabled = isView || isSubmitting;
    const fields = (
        <div className={styles.formContainer}>
            <section className={styles.section}>
                <div className={styles.sectionTitle}>
                    <Clock aria-hidden="true" />
                    <span>Time Period</span>
                </div>
                <div className={styles.timeGrid}>
                    {['start', 'end'].map(name => <DateTimePicker key={name} name={name}
                        label={name === 'start' ? 'Start Time' : 'End Time'} aria-label={`Availability ${name} time`}
                        value={name === 'start' ? startValue : endValue} isDisabled={disabled}
                        portalContainer={portalContainer} onOpenChange={setDateMenuOpen}
                        onDraftValidityChange={complete => { dateTimeValidity.current[name] = complete; }}
                        onChange={next => setNewAvailability(prev => ({ ...prev, [name]: next ? next.toString() : '' }))} />)}
                </div>
            </section>
            <section className={styles.section}>
                <div className={styles.typeGrid}>
                    <div className={styles.field}>
                        <div className={styles.sectionTitle}>
                            <MarkerPin01 aria-hidden="true" />
                            <span>Location Preference</span>
                        </div>
                        <Select name="locationType" size="md" placeholder="Select location..."
                            aria-label="Location type" isRequired isDisabled={disabled} validationBehavior="native"
                            selectedKey={locationOptions.some(option => option.value === newAvailability.locationType) ? newAvailability.locationType : null}
                            onSelectionChange={key => { if (key) handleLocationChange({ value: key }); }}
                            portalContainer={portalContainer} items={locationOptions.map(option => ({ ...option, id: option.value }))}>
                            {item => <Select.Item id={item.id} label={item.label} />}
                        </Select>
                    </div>
                </div>
            </section>
        </div>
    );

    return (
        <ModalOverlay isOpen isDismissable={!isSubmitting} isKeyboardDismissDisabled={isSubmitting || dateMenuOpen}
            onOpenChange={open => { if (!open) closeModal(); }} className={styles.overlay}>
            <Modal className={styles.modal}>
                <Dialog ref={setPortalContainer} aria-labelledby={titleId} className={styles.dialog}>
                    <header className={styles.header}>
                        <h5 id={titleId} className={styles.title}>{title}</h5>
                        <Button size="sm" color="tertiary" iconLeading={XClose} aria-label="Close" isDisabled={isSubmitting} onClick={closeModal} />
                    </header>
                    {isView ? <div className={styles.body}>{fields}</div> : (
                        <form aria-label="Availability form" onSubmit={submitAvailability} className={styles.form}>
                            <div className={styles.body}>{fields}</div>
                            <footer className={styles.footer}>
                                {isEdit && <Button size="sm" color="secondary-destructive" isDisabled={isSubmitting} onClick={deleteAvailability}>Delete</Button>}
                                <Button size="sm" color="primary" type="submit" isDisabled={isSubmitting} isLoading={isSubmitting} showTextWhileLoading>
                                    {isSubmitting ? 'Loading...' : (isEdit ? 'Save Changes' : 'Add Availability')}
                                </Button>
                            </footer>
                        </form>
                    )}
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
};

export default TutorAvailabilityForm;
