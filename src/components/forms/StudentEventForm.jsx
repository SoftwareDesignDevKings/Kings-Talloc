'use client';

import useBookableAvailability from '@/hooks/useBookableAvailability';
import React, { useState, useEffect, useCallback } from 'react';
import { isAfter, format } from 'date-fns';
import Select from 'react-select';
import BaseModal from '../modals/BaseModal.jsx';
import { useAppData } from '@/contexts/AppDataContext';
import { updateEventInFirestore, createEventInFirestore } from '@/firestore/firestoreOperations';
import { CalendarEntityType } from '@lib/patterns/calendarStrategy';
import { rangeCovered } from '@/lib/scheduling/eventRules';
import { buildEligibleTutorOptions } from '@/lib/canvas/canvasCoverage';

import useAlert from '@/hooks/useAlert.js';

const StudentEventForm = ({
    mode,
    newEvent,
    setNewEvent,
    eventToEdit,
    setShowStudentModal,
    studentEmail,
}) => {
    const {
        setCalendarStudentRequests,
        calendarStudentRequests,
        tutors,
        studentTutorEligibility,
    } = useAppData();
    
    // derive mode flags
    const isView = mode === 'view';
    const isEdit = mode === 'edit';
    const isEditing = isEdit || isView; 
    const rangeStart = new Date(newEvent.start), rangeEnd = new Date(newEvent.end);
    const bookableAvailability = useBookableAvailability(studentEmail, !isView, {
        start: Number.isNaN(+rangeStart) ? new Date() : rangeStart,
        end: !Number.isFinite(+rangeEnd) || rangeEnd <= rangeStart ? new Date((+rangeStart || Date.now()) + 86400000) : rangeEnd,
    });

    // for backward compat with existing logic

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tutorOptions, setTutorOptions] = useState([]);
    const [filteredTutors, setFilteredTutors] = useState([]);
    const [selectedTutor, setSelectedTutor] = useState(
        newEvent.staff && newEvent.staff.length > 0 ? newEvent.staff[0] : null,
    );
    const [selectedPreference, setSelectedPreference] = useState(newEvent.preference || null);
    const selectedStudent =
        newEvent.students && newEvent.students.length > 0
            ? newEvent.students[0]
            : { value: studentEmail, label: studentEmail };
    const { addAlert } = useAlert();

    const preferenceOptions = ['Homework (Prep)', 'Assignments', 'Exam Help', 'General'];

    const getTutorsAvailableForRange = useCallback((start, end) => {
        if (
            !start ||
            !end ||
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime())
        ) {
            return [];
        }

        return tutorOptions.filter(tutor => rangeCovered(start, end, bookableAvailability.slots.filter(slot => slot.tutor === tutor.value)));
    }, [bookableAvailability.slots, tutorOptions]);

    const filterTutorsByAvailability = useCallback((start, end) => {
        setFilteredTutors(getTutorsAvailableForRange(start, end));
    }, [getTutorsAvailableForRange]);

    // transform provider data into react-select format
    useEffect(() => {
        setTutorOptions(buildEligibleTutorOptions(tutors, studentTutorEligibility));
    }, [tutors, studentTutorEligibility]);

    useEffect(() => {
        filterTutorsByAvailability(new Date(newEvent.start), new Date(newEvent.end));
    }, [filterTutorsByAvailability, newEvent.end, newEvent.start]);

    useEffect(() => {
        if (!isEditing) {
            setNewEvent(prev => ({
                ...prev,
                students: [selectedStudent],
                createdByStudent: true,
                approvalStatus: 'pending',
            }));
        }
    // Student identity is fixed for this form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentEmail, isEditing, setNewEvent]);

    // guard against stale selectedTutor when time changes
    useEffect(() => {
        if (
            selectedTutor && bookableAvailability.ready && tutorOptions.length > 0 &&
            !getTutorsAvailableForRange(new Date(newEvent.start), new Date(newEvent.end)).some(t => t.value === selectedTutor.value)
        ) {
            setSelectedTutor(null);
            setNewEvent(prev => ({ ...prev, staff: [] }));
        }
    }, [selectedTutor, setNewEvent, bookableAvailability.ready, tutorOptions, getTutorsAvailableForRange, newEvent.start, newEvent.end]);

    const handleTutorSelectChange = (selectedOption) => {
        setSelectedTutor(selectedOption);
        setNewEvent(prev => ({ ...prev, staff: [selectedOption] }));
    };

    const handlePreferenceClick = (preference) => {
        setSelectedPreference(preference);
        setNewEvent(prev => ({ ...prev, preference }));
    };

    const validateDates = () => {
        const start = new Date(newEvent.start);
        const end = new Date(newEvent.end);
        if (!isAfter(end, start)) {
            addAlert('error', 'End date must be after the start date.');
            return false;
        }
        return true;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewEvent({ ...newEvent, [name]: value });
    };

    const handleDateChange = (e) => {
        handleInputChange(e);
        const { name, value } = e.target;
        if (name === 'start' || name === 'end') {
            const start = name === 'start' ? new Date(value) : new Date(newEvent.start);
            const end = name === 'end' ? new Date(value) : new Date(newEvent.end);
            filterTutorsByAvailability(start, end);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate tutor selection
        if (!bookableAvailability.ready || !selectedTutor || !filteredTutors.some(tutor => tutor.value === selectedTutor.value)) {
            addAlert('error', 'You must select a tutor available to have a tutor session');
            return false; // Don't close modal
        }

        const eventData = {
            title: 'Tutoring',
            workType: 'work',
            additionalStudents: (Array.isArray(newEvent.additionalStudents) ? newEvent.additionalStudents.join(',') : newEvent.additionalStudents || '').split(/[,\n]/).map(name => name.trim()).filter(Boolean),
            start: new Date(newEvent.start),
            end: new Date(newEvent.end),
            students: newEvent.students || [],
            studentEmails: (newEvent.students || []).map(s => s.value || s), 
            // firebase sec rules require students maped to their value 
            staff: newEvent.staff || [],
            staffEmails: (newEvent.staff || []).map(s => s.value || s),
            classes: [],
            subject: null,
            preference: newEvent.preference,
            createdByStudent: true,
            approvalStatus: 'pending',
            isStudentRequest: true,
        };

        // Remove undefined fields (Firestore doesn't accept undefined)
        Object.keys(eventData).forEach(key => {
            if (eventData[key] === undefined) {
                delete eventData[key];
            }
        });

        try {
            if (isEditing) {
                await updateEventInFirestore(eventToEdit.id, eventData, 'studentEventRequests');
                setCalendarStudentRequests(
                    calendarStudentRequests.map((req) =>
                        req.id === eventToEdit.id
                            ? {
                                ...eventData,
                                id: eventToEdit.id,
                                entityType: CalendarEntityType.STUDENT_REQUEST
                            }
                            : req
                    )
                );
            } else {
                const docId = await createEventInFirestore(eventData, 'studentEventRequests');
                setCalendarStudentRequests([
                    ...calendarStudentRequests,
                    {
                        ...eventData,
                        id: docId,
                        entityType: CalendarEntityType.STUDENT_REQUEST
                    },
                ]);

                addAlert('success', 'Tutoring session request sent for approval');
            }
            return true; // Success - allow modal to close
        } catch (error) {
            console.error('Failed to submit student event request:', error);
            addAlert('error', 'Failed to submit event request');
            return false; // Error - don't close modal
        }
    };

    const handleMenuOpen = () => {
        const start = new Date(newEvent.start);
        const end = new Date(newEvent.end);
        filterTutorsByAvailability(start, end);
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return false;
        if (!validateDates()) {
            return false; // Validation failed - don't close modal
        }
        setIsSubmitting(true);
        try {
            return await handleSubmit(e);
        } catch (error) {
            console.error('Failed to submit student event request:', error);
            addAlert('error', 'Failed to submit event request');
            return false;
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <BaseModal
            show={true}
            onHide={() => setShowStudentModal(false)}
            title={isView ? 'Event Details' : (isEdit ? 'Edit Event' : 'Add New Event')}
            size="md"
            onSubmit={isView ? undefined : onSubmit}
            submitText={isEdit ? 'Save Changes' : 'Add Event'}
            loading={isSubmitting}
            deleteButton={null}
            showFooter={!isView}
        >
            <div className="mb-3">
                <label htmlFor="start" className="form-label">
                    Start Time
                </label>
                <input
                    type="datetime-local"
                    className="form-control"
                    name="start"
                    id="start"
                    value={format(new Date(newEvent.start), "yyyy-MM-dd'T'HH:mm")}
                    onChange={handleDateChange}
                    required
                    disabled={isView}
                    aria-label="Event start time"
                    aria-required="true"
                />
            </div>
            <div className="mb-3">
                <label htmlFor="end" className="form-label">
                    End Time
                </label>
                <input
                    type="datetime-local"
                    className="form-control"
                    name="end"
                    id="end"
                    value={format(new Date(newEvent.end), "yyyy-MM-dd'T'HH:mm")}
                    onChange={handleDateChange}
                    required
                    disabled={isView}
                    aria-label="Event end time"
                    aria-required="true"
                />
            </div>
            <div className="mb-3">
                <label className="form-label" id="preference-label">Preference</label>
                <div className="d-flex flex-wrap gap-2" role="group" aria-labelledby="preference-label">
                    {preferenceOptions.map((preference) => (
                        <button
                            key={preference}
                            type="button"
                            className={`btn btn-sm ${selectedPreference === preference ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => handlePreferenceClick(preference)}
                            disabled={isView}
                            aria-pressed={selectedPreference === preference}
                            aria-label={`Select ${preference} as preference`}
                        >
                            {preference}
                        </button>
                    ))}
                </div>
            </div>
            <div className="mb-3">
                <label htmlFor="tutor" className="form-label">
                    Assign Tutor
                </label>
                <Select
                    name="tutor"
                    options={filteredTutors}
                    value={selectedTutor}
                    onChange={handleTutorSelectChange}
                    onMenuOpen={handleMenuOpen}
                    classNamePrefix="select"
                    isDisabled={isView}
                    noOptionsMessage={() => 'No eligible tutors available for the selected time range'}
                    aria-label="Assign tutor to event"
                    inputId="tutor"
                />
            </div>
            <div className="mb-3">
                <label htmlFor="additionalStudents" className="form-label">Other students (optional)</label>
                <textarea id="additionalStudents" name="additionalStudents" className="form-control" value={Array.isArray(newEvent.additionalStudents) ? newEvent.additionalStudents.join(', ') : newEvent.additionalStudents || ''} onChange={handleInputChange} disabled={isView} placeholder="Names, separated by commas" />
            </div>
            {!isView && (!bookableAvailability.ready || bookableAvailability.error) && <div role="status" className="small text-warning-emphasis">{bookableAvailability.error || 'Refreshing availability…'} <button type="button" className="btn btn-link btn-sm" onClick={bookableAvailability.refresh}>Retry</button></div>}

        </BaseModal>
    );
};

export default StudentEventForm;
