'use client';

import useBookableAvailability from '@/hooks/useBookableAvailability';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { isAfter, format } from 'date-fns';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';
import BaseModal from '../modals/BaseModal.jsx';
import { useAppData } from '@/contexts/AppDataContext';
import { updateEventInFirestore, createEventInFirestore } from '@/firestore/firestoreOperations';
import { CalendarEntityType } from '@lib/patterns/calendarStrategy';
import { rangeCovered, emailOf } from '@/lib/scheduling/eventRules';
import { buildEligibleTutorOptions } from '@/lib/canvas/canvasCoverage';
import { SESSION_FOCUS_OPTIONS, SESSION_TOPICS_MAX_LENGTH, isValidSessionFocus, sessionFocusLabel } from '@/lib/scheduling/sessionFocus';

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
    const [studentSearchError, setStudentSearchError] = useState(null);
    const loadStudentOptions = useCallback(async query => {
        if (query.trim().length < 2) return [];
        try {
            const response = await fetch(`/api/students?q=${encodeURIComponent(query.trim())}`, { cache: 'no-store' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            setStudentSearchError(null);
            return data.students.map(student => ({ value: student.email, label: student.name }));
        } catch {
            setStudentSearchError('Unable to search students. Please try again.');
            return [];
        }
    }, []);
    const selectedStudents = useMemo(() => {
        const selected = new Map((newEvent.students || []).map(student => [emailOf(student), { value: emailOf(student), label: student.label || emailOf(student) }]));
        if (!isView) {
            const email = emailOf(studentEmail);
            const requester = selected.get(email) || { value: email, label: email };
            selected.delete(email);
            return [{ ...requester, isFixed: true }, ...selected.values()];
        }
        return [...selected.values()];
    }, [newEvent.students, studentEmail, isView]);
    const rangeStart = new Date(newEvent.start), rangeEnd = new Date(newEvent.end);
    const bookableAvailability = useBookableAvailability(studentEmail, !isView, {
        students: selectedStudents.map(emailOf),
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
    const selectedPreference = newEvent.preference || '';
    const [focusError, setFocusError] = useState(null);
    const { addAlert } = useAlert();


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

    const handleStudentsChange = options => {
        const requester = selectedStudents.find(student => emailOf(student) === emailOf(studentEmail));
        const peers = (options || []).filter(student => emailOf(student) !== emailOf(studentEmail));
        setNewEvent(previous => ({ ...previous, students: [requester, ...peers].map(({ value, label }) => ({ value, label })) }));
    };

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
        setFocusError(null);
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

        if (!isValidSessionFocus(newEvent.preference)) {
            setFocusError('Select a session focus before submitting your request.');
            return false;
        }

        // Validate tutor selection
        if (!bookableAvailability.ready || !selectedTutor || !filteredTutors.some(tutor => tutor.value === selectedTutor.value)) {
            addAlert('error', 'You must select a tutor available to have a tutor session');
            return false; // Don't close modal
        }

        const eventData = {
            title: isEditing ? eventToEdit.title || 'Tutoring' : 'Tutoring',
            workType: 'work',
            additionalStudents: [],
            requesterEmail: eventToEdit?.requesterEmail || emailOf(studentEmail),
            start: new Date(newEvent.start),
            end: new Date(newEvent.end),
            students: selectedStudents.map(({ value, label }) => ({ value, label })),
            studentEmails: selectedStudents.map(emailOf),
            // firebase sec rules require students maped to their value
            staff: [selectedTutor],
            staffEmails: [selectedTutor.value],
            classes: [],
            subject: null,
            preference: newEvent.preference,
            sessionTopics: (newEvent.sessionTopics || '').trim(),
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
                await updateEventInFirestore(eventToEdit.id, eventData, 'studentEventRequests', eventToEdit.revision || 0);
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
            addAlert('error', error.message || 'Failed to submit event request');
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
            addAlert('error', error.message || 'Failed to submit event request');
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
            noValidate
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
            <fieldset className="mb-3">
                <legend className="form-label fs-6">Session focus{!isView && ' (required)'}</legend>
                {isView ? <div>{sessionFocusLabel(newEvent.preference)}</div> : <>
                    <div className="d-flex flex-wrap gap-2">
                        {SESSION_FOCUS_OPTIONS.map(({ value, label }) => (
                            <React.Fragment key={value}>
                                <input
                                    type="radio"
                                    className="btn-check"
                                    name="preference"
                                    value={value}
                                    id={`session-focus-${value.replace(/[^a-z]/gi, '')}`}
                                    checked={selectedPreference === value}
                                    onChange={() => handlePreferenceClick(value)}
                                    required
                                    aria-describedby={focusError ? 'session-focus-error' : undefined}
                                />
                                <label className="btn btn-sm btn-outline-primary" htmlFor={`session-focus-${value.replace(/[^a-z]/gi, '')}`}>{label}</label>
                            </React.Fragment>
                        ))}
                    </div>
                    {focusError && <div id="session-focus-error" className="text-danger small mt-2" role="alert">{focusError}</div>}
                </>}
            </fieldset>
            <div className="mb-3">
                <label htmlFor="sessionTopics" className="form-label">Topics to cover (optional)</label>
                <textarea
                    id="sessionTopics"
                    name="sessionTopics"
                    className="form-control"
                    rows={3}
                    value={newEvent.sessionTopics || ''}
                    onChange={handleInputChange}
                    maxLength={SESSION_TOPICS_MAX_LENGTH}
                    disabled={isView}
                    aria-describedby="session-topics-help"
                />
                <div id="session-topics-help" className="form-text">Include specific topics, questions or tasks you would like to cover.</div>
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
                    noOptionsMessage={() => 'No tutors eligible for everyone in this booking are available at this time'}
                    aria-label="Assign tutor to event"
                    inputId="tutor"
                />
            </div>
            <div className="mb-3">
                <label htmlFor="students" className="form-label">Students</label>
                <AsyncSelect
                    isMulti
                    name="students"
                    cacheOptions
                    loadOptions={loadStudentOptions}
                    value={selectedStudents}
                    onChange={handleStudentsChange}
                    classNamePrefix="select"
                    inputId="students"
                    aria-label="Students in this booking"
                    isDisabled={isView}
                    isClearable={false}
                    styles={{ multiValueRemove: (base, state) => state.data.isFixed ? { ...base, display: 'none' } : base }}
                    noOptionsMessage={({ inputValue }) => inputValue.trim().length < 2 ? 'Type at least 2 letters to find students' : 'No students found'}
                    placeholder="Search students by name or email"
                />
                {!isView && <div className="form-text">You are included. Select classmates to request a group session.</div>}
                {!isView && studentSearchError && <div role="status" className="small text-warning-emphasis">{studentSearchError}</div>}
            </div>
            {!isView && (!bookableAvailability.ready || bookableAvailability.error) && <div role="status" className="small text-warning-emphasis">{bookableAvailability.error || 'Refreshing availability…'} <button type="button" className="btn btn-link btn-sm" onClick={bookableAvailability.refresh}>Retry</button></div>}

        </BaseModal>
    );
};

export default StudentEventForm;
