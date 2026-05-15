'use client';

import React, { useState, useEffect } from 'react';
import { isAfter, format } from 'date-fns';
import Select from 'react-select';
import BaseModal from '../modals/BaseModal.jsx';
import { useAppData } from '@/contexts/AppDataContext';
import { updateEventInFirestore, createEventInFirestore, deleteEventFromFirestore } from '@/firestore/firestoreOperations';
import { CalendarEntityType } from '@lib/patterns/calendarStrategy';

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
        calendarAvailabilities,
        tutors,
        classes,
    } = useAppData();
    
    // derive mode flags
    const isView = mode === 'view';
    const isEdit = mode === 'edit';
    const isEditing = isEdit || isView; 
    // for backward compat with existing logic

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tutorOptions, setTutorOptions] = useState([]);
    const [filteredTutors, setFilteredTutors] = useState([]);
    const [selectedTutor, setSelectedTutor] = useState(
        newEvent.staff && newEvent.staff.length > 0 ? newEvent.staff[0] : null,
    );
    const [selectedClass, setSelectedClass] = useState(
        newEvent.classes && newEvent.classes.length > 0 ? newEvent.classes[0] : null,
    );
    const [selectedPreference, setSelectedPreference] = useState(newEvent.preference || null);
    const selectedStudent =
        newEvent.students && newEvent.students.length > 0
            ? newEvent.students[0]
            : { value: studentEmail, label: studentEmail };
    const { addAlert } = useAlert();

    const preferenceOptions = ['Homework (Prep)', 'Assignments', 'Exam Help', 'General'];
    const classOptions = (classes || []).map((cls) => ({
        value: cls.id,
        label: cls.courseCode ? `${cls.name} (${cls.courseCode})` : cls.name,
    }));

    // transform provider data into react-select format
    useEffect(() => {
        const tutorList = tutors.map((tutor) => ({
            value: tutor.email,
            label: tutor.name || tutor.email,
        }));
        setTutorOptions(tutorList);
    }, [tutors]);

    useEffect(() => {
        if (!isEditing) {
            setNewEvent(prev => ({
                ...prev,
                students: [selectedStudent],
                createdByStudent: true,
                approvalStatus: 'pending',
            }));
        }
    }, [selectedStudent, isEditing, setNewEvent]);

    // guard against stale selectedTutor when time changes
    useEffect(() => {
        if (
            selectedTutor &&
            filteredTutors.length > 0 &&
            !filteredTutors.some(t => t.value === selectedTutor.value)
        ) {
            setSelectedTutor(null);
            setNewEvent(prev => ({ ...prev, staff: [] }));
        }
    }, [filteredTutors, selectedTutor, setNewEvent]);

    const handleTutorSelectChange = (selectedOption) => {
        setSelectedTutor(selectedOption);
        setNewEvent(prev => ({ ...prev, staff: [selectedOption] }));
    };

    const handleClassSelectChange = (selectedOption) => {
        setSelectedClass(selectedOption);
        setNewEvent(prev => ({
            ...prev,
            classes: selectedOption ? [selectedOption] : [],
        }));
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

    const filterTutorsByAvailability = (start, end) => {
        const availableTutors = tutorOptions.filter((tutor) => {
            const tutorAvailabilities = calendarAvailabilities.filter(
                (availability) => availability.tutor === tutor.value,
            );

            return tutorAvailabilities.some((availability) => {
                const availStart = new Date(availability.start);
                const availEnd = new Date(availability.end);
                const types = Array.isArray(availability.workType) ? availability.workType : [availability.workType];
                return (
                    (availStart <= start || availStart.getTime() === start.getTime()) &&
                    (availEnd >= end || availEnd.getTime() === end.getTime()) &&
                    (types.some(t => t === 'tutoring' || t === 'tutoringOrWork') ||
                        availability.workType === undefined)
                ); // undefined check for backwards compatibility
            });
        });

        setFilteredTutors(availableTutors);
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
        if (!selectedTutor || filteredTutors.length === 0) {
            addAlert('error', 'You must select a tutor available to have a tutor session');
            return false; // Don't close modal
        }

        const eventData = {
            title: 'Tutoring',
            start: new Date(newEvent.start),
            end: new Date(newEvent.end),
            students: newEvent.students || [],
            studentEmails: (newEvent.students || []).map(s => s.value || s), 
            // firebase sec rules require students maped to their value 
            staff: newEvent.staff || [],
            classes: newEvent.classes || [],
            subject: null,
            preference: newEvent.preference,
            createdByStudent: true,
            approvalStatus: newEvent.approvalStatus || 'pending',
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

                // Show two alerts stacked on top of each other
                addAlert('success', 'Tutoring session request created successfully');
                addAlert('info', 'Watch your emails for an MS Teams Meeting. DO NOT RSVP.');
            }
            return true; // Success - allow modal to close
        } catch (error) {
            console.error('Failed to submit student event request:', error);
            addAlert('error', 'Failed to submit event request');
            return false; // Error - don't close modal
        }
    };

    const handleDelete = async () => {
        try {
            await deleteEventFromFirestore(eventToEdit.id, 'studentEventRequests');
            setCalendarStudentRequests(
                calendarStudentRequests.filter((req) => req.id !== eventToEdit.id)
            );
            return true; // Success - allow modal to close
        } catch (error) {
            console.error('Failed to delete student event request:', error);
            addAlert('error', 'Failed to delete event request');
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
                <label htmlFor="class" className="form-label">
                    Class
                </label>
                <Select
                    name="class"
                    options={classOptions}
                    value={selectedClass}
                    onChange={handleClassSelectChange}
                    classNamePrefix="select"
                    isDisabled={isView}
                    aria-label="Select class"
                    inputId="class"
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
                    noOptionsMessage={() => 'No tutors available for the selected time range'}
                    aria-label="Assign tutor to event"
                    inputId="tutor"
                />
            </div>
            {newEvent.minStudents > 0 && (
                <div className="mb-3">
                    <label className="form-label">Student Responses</label>
                    {newEvent.studentResponses && newEvent.studentResponses.length > 0 ? (
                        <ul className="list-unstyled" aria-label="List of student responses">
                            {newEvent.studentResponses.map((response, index) => (
                                <li key={index} className="mb-1">
                                    {response.email}: {response.response ? 'Accepted' : 'Declined'}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted" role="status">No students have responded yet.</p>
                    )}
                </div>
            )}
        </BaseModal>
    );
};

export default StudentEventForm;
