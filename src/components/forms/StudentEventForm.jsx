'use client';

import React, { useState, useEffect } from 'react';
import { isAfter, format } from 'date-fns';
import Select from 'react-select';
import BaseModal from '../modals/BaseModal.jsx';
import { db } from '@/firestore/firestoreClient.js';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestoreFetchAvailabilities } from '../../firestore/firestoreFetch';
import { useCalendarData } from '@/providers/CalendarDataProvider';
import {
    updateEventInFirestore,
    createEventInFirestore,
    deleteEventFromFirestore,
} from '@/firestore/firestoreOperations';

const StudentEventForm = ({
    mode,
    newEvent,
    setNewEvent,
    eventToEdit,
    setShowStudentModal,
    studentEmail,
}) => {
    const { calendarStudentRequests, setCalendarStudentRequests } = useCalendarData();
    // Derive mode flags
    const isView = mode === 'view';
    const isEdit = mode === 'edit';
    const isEditing = isEdit || isView; 
    // for backward compat with existing logic

    const [tutorOptions, setTutorOptions] = useState([]);
    const [subjectOptions, setSubjectOptions] = useState([]);
    const [filteredTutors, setFilteredTutors] = useState([]);
    const [selectedTutor, setSelectedTutor] = useState(
        newEvent.staff && newEvent.staff.length > 0 ? newEvent.staff[0] : null,
    );
    const [selectedSubject, setSelectedSubject] = useState(newEvent.subject || null);
    const [selectedPreference, setSelectedPreference] = useState(newEvent.preference || null);
    const [selectedStudent] = useState(
        newEvent.students && newEvent.students.length > 0
            ? newEvent.students[0]
            : { value: studentEmail, label: studentEmail },
    );
    const [availabilities, setAvailabilities] = useState([]);
    const [error, setError] = useState('');

    const preferenceOptions = ['Homework (Prep)', 'Assignments', 'Exam Help', 'General'];

    useEffect(() => {
        const fetchTutors = async () => {
            const q = query(collection(db, 'users'), where('role', '==', 'tutor'));
            const querySnapshot = await getDocs(q);
            const tutorList = querySnapshot.docs.map((doc) => ({
                value: doc.data().email,
                label: doc.data().name || doc.data().email,
            }));
            setTutorOptions(tutorList);
        };

        const fetchSubjects = async () => {
            const querySnapshot = await getDocs(collection(db, 'subjects'));
            const subjectList = querySnapshot.docs.map((doc) => ({
                value: doc.id,
                label: doc.data().name,
            }));
            setSubjectOptions(subjectList);
        };

        const fetchAllData = async () => {
            await fetchTutors();
            await fetchSubjects();
            firestoreFetchAvailabilities(setAvailabilities);
        };

        fetchAllData();
    }, []);

    useEffect(() => {
        if (!isEditing) {
            setNewEvent({
                ...newEvent,
                students: [selectedStudent],
                createdByStudent: true,
                approvalStatus: 'pending',
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedStudent]);

    const handleTutorSelectChange = (selectedOption) => {
        setSelectedTutor(selectedOption);
        setNewEvent({ ...newEvent, staff: [selectedOption] });
    };

    const handleSubjectChange = (selectedOption) => {
        setSelectedSubject(selectedOption);
        setNewEvent({ ...newEvent, subject: selectedOption });
    };

    const handlePreferenceClick = (preference) => {
        setSelectedPreference(preference);
        setNewEvent({ ...newEvent, preference });
    };

    const validateDates = () => {
        const start = new Date(newEvent.start);
        const end = new Date(newEvent.end);
        if (!isAfter(end, start)) {
            setError('End date must be after the start date.');
            return false;
        }
        setError('');
        return true;
    };

    const filterTutorsByAvailability = (start, end) => {
        const availableTutors = tutorOptions.filter((tutor) => {
            const tutorAvailabilities = availabilities.filter(
                (availability) => availability.tutor === tutor.value,
            );
            return tutorAvailabilities.some((availability) => {
                const availStart = new Date(availability.start);
                const availEnd = new Date(availability.end);
                return (
                    (availStart <= start || availStart.getTime() === start.getTime()) &&
                    (availEnd >= end || availEnd.getTime() === end.getTime()) &&
                    (availability.workType == 'tutoring' ||
                        availability.workType == 'tutoringOrWork' ||
                        availability.workType == undefined)
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

        const eventData = {
            title: 'Tutoring',
            start: new Date(newEvent.start),
            end: new Date(newEvent.end),
            students: newEvent.students || [],
            staff: newEvent.staff || [],
            subject: newEvent.subject,
            preference: newEvent.preference,
            createdByStudent: true,
            approvalStatus: newEvent.approvalStatus || 'pending',
            isStudentRequest: true,
        };

        try {
            if (isEditing) {
                await updateEventInFirestore(eventToEdit.id, eventData, 'studentEventRequests');
                setCalendarStudentRequests(
                    calendarStudentRequests.map((req) =>
                        req.id === eventToEdit.id ? { ...eventData, id: eventToEdit.id } : req
                    )
                );
            } else {
                const docId = await createEventInFirestore(eventData, 'studentEventRequests');
                setCalendarStudentRequests([
                    ...calendarStudentRequests,
                    { ...eventData, id: docId },
                ]);
            }
            setShowStudentModal(false);
        } catch (error) {
            console.error('Failed to submit student event request:', error);
            setError('Failed to submit event request');
        }
    };

    const handleDelete = async () => {
        try {
            await deleteEventFromFirestore(eventToEdit.id, 'studentEventRequests');
            setCalendarStudentRequests(
                calendarStudentRequests.filter((req) => req.id !== eventToEdit.id)
            );
            setShowStudentModal(false);
        } catch (error) {
            console.error('Failed to delete student event request:', error);
            setError('Failed to delete event request');
        }
    };

    const handleMenuOpen = () => {
        const start = new Date(newEvent.start);
        const end = new Date(newEvent.end);
        filterTutorsByAvailability(start, end);
    };

    const onSubmit = (e) => {
        e.preventDefault();
        if (validateDates()) {
            handleSubmit(e);
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
            {error && <div className="alert alert-danger" role="alert" aria-live="polite">{error}</div>}

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
                <label htmlFor="subject" className="form-label">
                    Subject
                </label>
                <Select
                    name="subject"
                    options={subjectOptions}
                    value={selectedSubject}
                    onChange={handleSubjectChange}
                    classNamePrefix="select"
                    placeholder="Select a subject"
                    isDisabled={isView}
                    aria-label="Select subject"
                    inputId="subject"
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
