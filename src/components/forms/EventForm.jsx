'use client';

import React, { useState } from 'react';
import { isAfter, format, isValid } from 'date-fns';
import Select, { components } from 'react-select';
import BaseModal from '../modals/BaseModal.jsx';
import DeleteConfirmationModal from '../modals/DeleteConfirmationModal.jsx';
import { useEventFormData } from './useEventFormData';
import {
    calendarEventHandleDelete,
    calendarEventCreateTeamsMeeting,
    calendarEventHandleTeamsMeetingUpdate,
    calendarEventGetType,
} from '@/utils/calendarEvent';
import {
    getTeamsMeetingOccurrenceId,
    updateTeamsMeetingOccurrence,
} from '@/utils/msTeams';
import {
    updateEventInFirestore,
    createEventInFirestore,
    addOrUpdateEventInQueue,
    deleteEventFromFirestore,
    addEventException,
} from '@/firestore/firestoreOperations';
import { addWeeks } from 'date-fns';
import {
    MdEventNote,
    MdPeople,
    MdSettings,
    MdNoteAlt,
    MdAccessTime,
    MdSchool,
    MdMenuBook,
    MdFlag,
    FaChalkboardTeacher,
    FaUserGraduate,
    SiMicrosoftTeams,
} from '@/components/icons';
import useAlert from '@/hooks/useAlert';

const EventForm = ({ isEditing, newEvent, setNewEvent, eventToEdit, setShowModal, eventsData }) => {
    const [selectedStaff, setSelectedStaff] = useState(newEvent.staff || []);
    const [selectedClasses, setSelectedClasses] = useState(newEvent.classes || []);
    const [selectedStudents, setSelectedStudents] = useState(newEvent.students || []);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { setAlertMessage, setAlertType } = useAlert();

    // Fetch form data using custom hook
    const { staffOptions, classOptions, studentOptions } = useEventFormData(newEvent);

    // Inline handlers
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setNewEvent({ ...newEvent, [name]: val });
    };

    const handleStaffChange = (selectedStaff) => {
        setNewEvent({ ...newEvent, staff: selectedStaff });
    };

    const handleClassChange = (selectedClasses) => {
        setNewEvent({ ...newEvent, classes: selectedClasses });
    };

    const handleStudentChange = (selectedStudents) => {
        setNewEvent({ ...newEvent, students: selectedStudents });
    };

    const handleStaffSelectChange = (selectedOptions) => {
        setSelectedStaff(selectedOptions);
        handleStaffChange(selectedOptions);
    };

    const handleClassSelectChange = (selectedOptions) => {
        setSelectedClasses(selectedOptions);
        handleClassChange(selectedOptions);
    };

    const handleStudentSelectChange = (selectedOptions) => {
        setSelectedStudents(selectedOptions);
        handleStudentChange(selectedOptions);
    };

    const handleMinStudentsChange = (e) => {
        setNewEvent({ ...newEvent, minStudents: parseInt(e.target.value, 10) });
    };

    const handleApprovalChange = (selectedOption) => {
        const approvalStatus = selectedOption.value;
        setNewEvent({ ...newEvent, approvalStatus });
    };

    const validateDates = () => {
        const start = new Date(newEvent.start);
        const end = new Date(newEvent.end);
        if (!isAfter(end, start)) {
            setAlertType('error');
            setAlertMessage('End date must be after the start date.');
            return false;
        }
        return true;
    };

    const validateForm = () => {
        // Validate dates first
        if (!validateDates()) {
            return false;
        }

        // Validate staff is not empty
        if (!newEvent.staff || newEvent.staff.length === 0) {
            setAlertType('error');
            setAlertMessage('At least one tutor must be assigned to the event.');
            return false;
        }

        return true;
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        // Validate title
        if (!newEvent.title) {
            setAlertType('error');
            setAlertMessage('Title is required');
            return;
        }

        const eventData = {
            title: newEvent.title || '',
            start: new Date(newEvent.start),
            end: new Date(newEvent.end),
            description: newEvent.description || '',
            confirmationRequired: newEvent.confirmationRequired || false,
            staff: newEvent.staff || [],
            classes: newEvent.classes || [],
            students: newEvent.students || [],
            tutorResponses: newEvent.tutorResponses || [],
            studentResponses: newEvent.studentResponses || [],
            minStudents: newEvent.minStudents || 0,
            createdByStudent: newEvent.createdByStudent || false,
            approvalStatus: newEvent.approvalStatus || 'pending',
            workStatus: newEvent.workStatus || 'notCompleted',
            workType: newEvent.workType || 'tutoring',
            locationType: newEvent.locationType || '',
            subject: newEvent.subject || null,
            preference: newEvent.preference || null,
            recurring: newEvent.recurring || null,
            createTeamsMeeting: newEvent.createTeamsMeeting || false,
        };

        // Add 'until' date if recurring
        if (eventData.recurring && !isEditing) {
            eventData.until = addWeeks(new Date(newEvent.start), 10);
        } else if (eventData.recurring && isEditing && newEvent.until) {
            eventData.until = newEvent.until;
        }

        try {
            if (isEditing) {
                if (eventToEdit.isStudentRequest && eventData.approvalStatus === 'approved') {
                    await deleteEventFromFirestore(eventToEdit.id, 'studentEventRequests');
                    const docId = await createEventInFirestore(eventData);
                    await addOrUpdateEventInQueue({ ...eventData, id: docId }, 'store');
                    setShowModal(false);

                    // Handle Teams meeting creation
                    await calendarEventCreateTeamsMeeting(docId, eventData, {
                        setAlertType,
                        setAlertMessage,
                    });
                } else if (eventToEdit.isStudentRequest) {
                    await updateEventInFirestore(eventToEdit.id, eventData, 'studentEventRequests');
                    await addOrUpdateEventInQueue({ ...eventData, id: eventToEdit.id }, 'update');
                    setShowModal(false);
                } else if (eventToEdit.isRecurringInstance) {
                    // Detach from series and create a new standalone event
                    const { collectionName } = calendarEventGetType(eventToEdit);
                    await addEventException(
                        eventToEdit.recurringEventId,
                        eventToEdit.occurrenceIndex,
                        collectionName,
                    );
                    const {
                        id,
                        recurringEventId,
                        isRecurringInstance,
                        occurrenceIndex,
                        recurring,
                        eventExceptions,
                        until,
                        ...standaloneEventData
                    } = { ...eventToEdit, ...eventData };

                    const newDocId = await createEventInFirestore(standaloneEventData, collectionName);
                    await addOrUpdateEventInQueue({ ...standaloneEventData, id: newDocId }, 'store');
                    setShowModal(false);

                    if (standaloneEventData.teamsEventId) {
                        try {
                            const attendeesEmailArr = [...(standaloneEventData.students || []), ...(standaloneEventData.staff || [])].map(
                                (p) => p.value || p,
                            );
                            const occurrenceId = await getTeamsMeetingOccurrenceId(
                                standaloneEventData.teamsEventId,
                                eventToEdit.start,
                            );
                            await updateTeamsMeetingOccurrence(
                                occurrenceId,
                                standaloneEventData.title,
                                standaloneEventData.description,
                                new Date(standaloneEventData.start).toISOString(),
                                new Date(standaloneEventData.end).toISOString(),
                                attendeesEmailArr,
                            );
                            setAlertType('success');
                            setAlertMessage('Event updated and Teams occurrence updated');
                        } catch (error) {
                            console.error('Failed to update Teams meeting occurrence:', error);
                            setAlertType('error');
                            setAlertMessage(`Event updated but Teams meeting failed: ${error.message}`);
                        }
                    }
                } else {
                    await updateEventInFirestore(eventToEdit.id, eventData);
                    await addOrUpdateEventInQueue({ ...eventData, id: eventToEdit.id }, 'update');
                    setShowModal(false);

                    // Handle Teams meeting update/delete
                    await calendarEventHandleTeamsMeetingUpdate(eventToEdit, eventData, {
                        setAlertType,
                        setAlertMessage,
                    });
                }
            } else {
                const docId = await createEventInFirestore(eventData);
                await addOrUpdateEventInQueue({ ...eventData, id: docId }, 'store');
                setShowModal(false);

                // Handle Teams meeting creation for new events
                if (eventData.approvalStatus === 'approved' || eventData.createTeamsMeeting) {
                    await calendarEventCreateTeamsMeeting(docId, eventData, {
                        setAlertType,
                        setAlertMessage,
                    });
                }
            }
        } catch (error) {
            console.error('Failed to submit event:', error);
        }
    };

    const handleDeleteClick = () => {
        // Check if this is a recurring event
        const isRecurring = eventToEdit.recurring || eventToEdit.isRecurringInstance;

        if (isRecurring) {
            // Show confirmation modal for recurring events
            setShowDeleteConfirm(true);
        } else {
            // Delete non-recurring event directly
            calendarEventHandleDelete(eventToEdit, 'this', {
                ...eventsData,
                setAlertType,
                setAlertMessage,
            });
            setShowModal(false);
        }
    };

    const handleConfirmDelete = (deleteOption) => {
        calendarEventHandleDelete(eventToEdit, deleteOption, {
            ...eventsData,
            setAlertType,
            setAlertMessage,
        });
        setShowDeleteConfirm(false);
        setShowModal(false);
    };

    const approvalOptions = [
        { value: 'approved', label: 'Approve' },
        { value: 'denied', label: 'Deny' },
    ];

    const workStatusOptions = [
        { value: 'notCompleted', label: 'Not Completed' },
        { value: 'completed', label: 'Completed' },
        { value: 'notAttended', label: "Student Didn't Attend" },
    ];

    const workTypeOptions = [
        { value: 'tutoring', label: 'Tutoring' },
        { value: 'coaching', label: 'Coaching' },
        { value: 'work', label: 'Work' },
    ];

    const getStatusIcon = (status) => {
        switch (status) {
            case 'onsite':
                return '🏫';
            case 'remote':
                return '💻';
            case 'unavailable':
                return '❌';
            default:
                return '❔';
        }
    };

    const customOption = (props) => {
        const { data } = props;
        return (
            <components.Option {...props}>
                <span>{getStatusIcon(data.status)}</span> {data.label}
            </components.Option>
        );
    };

    const customSingleValue = (props) => {
        const { data } = props;
        return (
            <components.SingleValue {...props}>
                <span>{getStatusIcon(data.status)}</span> {data.label}
            </components.SingleValue>
        );
    };

    return (
        <>
            <BaseModal
                show={!showDeleteConfirm}
                onHide={() => setShowModal(false)}
                title={isEditing ? 'Edit Event' : 'Add New Event'}
                size="lg"
                onSubmit={onSubmit}
                submitText={isEditing ? 'Save Changes' : 'Add Event'}
                deleteButton={
                    isEditing
                        ? {
                              text: 'Delete',
                              onClick: handleDeleteClick,
                              variant: 'danger',
                          }
                        : null
                }
            >
                <div className="accordion" id="eventFormAccordion">
                    {/* Event Details Section */}
                    <div className="accordion-item">
                        <h2 className="accordion-header">
                            <button
                                className="accordion-button"
                                type="button"
                                data-bs-toggle="collapse"
                                data-bs-target="#eventDetails"
                                aria-expanded="true"
                            >
                                <MdEventNote className="me-2" /> Event Details
                            </button>
                        </h2>
                        <div
                            id="eventDetails"
                            className="accordion-collapse collapse show"
                            data-bs-parent="#eventFormAccordion"
                        >
                            <div className="accordion-body">
                                <div className="mb-3">
                                    <label
                                        htmlFor="title"
                                        className="form-label small text-muted mb-1"
                                    >
                                        Title
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="title"
                                        id="title"
                                        value={newEvent.title}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label
                                        htmlFor="description"
                                        className="form-label small text-muted mb-1"
                                    >
                                        Description
                                    </label>
                                    <textarea
                                        className="form-control"
                                        rows={2}
                                        name="description"
                                        id="description"
                                        value={newEvent.description}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="mb-3">
                                    <button
                                        type="button"
                                        className={`btn d-flex align-items-center gap-2 ${newEvent.createTeamsMeeting ? 'btn-primary' : 'btn-outline-primary'}`}
                                        onClick={() =>
                                            setNewEvent({
                                                ...newEvent,
                                                createTeamsMeeting: !newEvent.createTeamsMeeting,
                                            })
                                        }
                                        style={
                                            newEvent.createTeamsMeeting
                                                ? {
                                                      backgroundColor: '#5059C9',
                                                      borderColor: '#5059C9',
                                                  }
                                                : { color: '#5059C9', borderColor: '#5059C9' }
                                        }
                                    >
                                        <SiMicrosoftTeams size={30} />
                                        Online Teams Meeting
                                    </button>

                                    {/* New: Display Teams Join URL if available */}
                                    {newEvent.teamsJoinUrl && (
                                        <div className="mt-2">
                                            <a
                                                href={newEvent.teamsJoinUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="d-flex align-items-center gap-1 text-decoration-none"
                                            >
                                                <SiMicrosoftTeams size={20} />
                                                Join Teams Meeting
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div className="row">
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label
                                                htmlFor="start"
                                                className="form-label small text-muted mb-1 d-flex align-items-center gap-1"
                                            >
                                                <MdAccessTime /> Start Time
                                            </label>
                                            <input
                                                type="datetime-local"
                                                className="form-control"
                                                name="start"
                                                id="start"
                                                value={
                                                    newEvent.start && isValid(new Date(newEvent.start))
                                                        ? format(
                                                              new Date(newEvent.start),
                                                              "yyyy-MM-dd'T'HH:mm",
                                                          )
                                                        : ''
                                                }
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-0">
                                            <label
                                                htmlFor="end"
                                                className="form-label small text-muted mb-1 d-flex align-items-center gap-1"
                                            >
                                                <MdAccessTime /> End Time
                                            </label>
                                            <input
                                                type="datetime-local"
                                                className="form-control"
                                                name="end"
                                                id="end"
                                                value={
                                                    newEvent.end && isValid(new Date(newEvent.end))
                                                        ? format(
                                                              new Date(newEvent.end),
                                                              "yyyy-MM-dd'T'HH:mm",
                                                          )
                                                        : ''
                                                }
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="d-flex gap-2 align-items-center mt-3">
                                    <small className="text-muted">Recurring:</small>
                                    <div className="btn-group btn-group-sm" role="group">
                                        <button
                                            type="button"
                                            className={`btn ${newEvent.recurring === 'weekly' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => {
                                                setNewEvent({
                                                    ...newEvent,
                                                    recurring:
                                                        newEvent.recurring === 'weekly'
                                                            ? null
                                                            : 'weekly',
                                                });
                                            }}
                                        >
                                            Repeat Weekly
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn ${newEvent.recurring === 'fortnightly' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                            onClick={() => {
                                                setNewEvent({
                                                    ...newEvent,
                                                    recurring:
                                                        newEvent.recurring === 'fortnightly'
                                                            ? null
                                                            : 'fortnightly',
                                                });
                                            }}
                                        >
                                            Repeat Fortnightly
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Participants Section */}
                    <div className="accordion-item">
                        <h2 className="accordion-header">
                            <button
                                className="accordion-button collapsed"
                                type="button"
                                data-bs-toggle="collapse"
                                data-bs-target="#participants"
                                aria-expanded="false"
                            >
                                <MdPeople className="me-2" /> Participants
                            </button>
                        </h2>
                        <div
                            id="participants"
                            className="accordion-collapse collapse"
                            data-bs-parent="#eventFormAccordion"
                        >
                            <div className="accordion-body">
                                <div className="mb-3">
                                    <label
                                        htmlFor="staff"
                                        className="form-label small text-muted mb-1 d-flex align-items-center gap-1"
                                    >
                                        <FaChalkboardTeacher /> Assign Tutor
                                    </label>
                                    <Select
                                        isMulti
                                        name="tutor"
                                        options={staffOptions}
                                        value={selectedStaff}
                                        onChange={handleStaffSelectChange}
                                        classNamePrefix="select"
                                        components={{
                                            Option: customOption,
                                            SingleValue: customSingleValue,
                                        }}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label
                                        htmlFor="classes"
                                        className="form-label small text-muted mb-1 d-flex align-items-center gap-1"
                                    >
                                        <MdSchool /> Assign Classes
                                    </label>
                                    <Select
                                        isMulti
                                        name="classes"
                                        options={classOptions}
                                        value={selectedClasses}
                                        onChange={handleClassSelectChange}
                                        classNamePrefix="select"
                                    />
                                </div>

                                <div className="mb-0">
                                    <label
                                        htmlFor="students"
                                        className="form-label small text-muted mb-1 d-flex align-items-center gap-1"
                                    >
                                        <FaUserGraduate /> Assign Students
                                    </label>
                                    <Select
                                        isMulti
                                        name="students"
                                        options={studentOptions}
                                        value={selectedStudents}
                                        onChange={handleStudentSelectChange}
                                        classNamePrefix="select"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Settings & Status Section */}
                    <div className="accordion-item">
                        <h2 className="accordion-header">
                            <button
                                className="accordion-button collapsed"
                                type="button"
                                data-bs-toggle="collapse"
                                data-bs-target="#settings"
                                aria-expanded="false"
                            >
                                <MdSettings className="me-2" /> Settings & Status
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
                                    />
                                </div>

                                {newEvent.minStudents > 0 && (
                                    <div className="mb-3">
                                        <small className="text-muted d-block mb-2">
                                            Student Responses
                                        </small>
                                        {newEvent.studentResponses &&
                                        newEvent.studentResponses.length > 0 ? (
                                            <div className="d-flex flex-wrap gap-1">
                                                {newEvent.studentResponses.map(
                                                    (response, index) => (
                                                        <span
                                                            key={index}
                                                            className={`badge bg-${response.response ? 'success' : 'danger'} fw-normal`}
                                                        >
                                                            {response.email}:{' '}
                                                            {response.response
                                                                ? 'Accepted'
                                                                : 'Declined'}
                                                        </span>
                                                    ),
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-muted mb-0 small fst-italic">
                                                No responses yet
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="mb-3">
                                    <label
                                        htmlFor="workType"
                                        className="form-label small text-muted mb-1"
                                    >
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
                                            (option) =>
                                                option.value === (newEvent.workType || 'tutoring'),
                                        )}
                                    />
                                </div>

                                <div className="mb-0">
                                    <label
                                        htmlFor="workStatus"
                                        className="form-label small text-muted mb-1"
                                    >
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
                                                option.value ===
                                                (newEvent.workStatus || 'notCompleted'),
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Student Request Section */}
                    {newEvent.createdByStudent && (
                        <div className="accordion-item">
                            <h2 className="accordion-header">
                                <button
                                    className="accordion-button collapsed"
                                    type="button"
                                    data-bs-toggle="collapse"
                                    data-bs-target="#studentRequest"
                                    aria-expanded="false"
                                >
                                    <MdNoteAlt className="me-2" /> Student Request
                                </button>
                            </h2>
                            <div
                                id="studentRequest"
                                className="accordion-collapse collapse"
                                data-bs-parent="#eventFormAccordion"
                            >
                                <div className="accordion-body">
                                    {newEvent.subject && (
                                        <div className="mb-2">
                                            <small className="text-muted d-block mb-1 d-flex align-items-center gap-1">
                                                <MdMenuBook /> Subject
                                            </small>
                                            <span className="badge bg-secondary fw-normal">
                                                {newEvent.subject.label || newEvent.subject}
                                            </span>
                                        </div>
                                    )}

                                    {newEvent.preference && (
                                        <div className="mb-3">
                                            <small className="text-muted d-block mb-1 d-flex align-items-center gap-1">
                                                <MdFlag /> Preference
                                            </small>
                                            <span className="badge bg-primary fw-normal">
                                                {newEvent.preference}
                                            </span>
                                        </div>
                                    )}

                                    <div className="mb-0">
                                        <label
                                            htmlFor="approvalStatus"
                                            className="form-label small text-muted mb-1"
                                        >
                                            Approval Status
                                        </label>
                                        <Select
                                            name="approvalStatus"
                                            options={approvalOptions}
                                            onChange={handleApprovalChange}
                                            classNamePrefix="select"
                                            defaultValue={
                                                newEvent.approvalStatus === 'approved'
                                                    ? { value: 'approved', label: 'Approve' }
                                                    : newEvent.approvalStatus === 'denied'
                                                      ? { value: 'denied', label: 'Deny' }
                                                      : null
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </BaseModal>

            <DeleteConfirmationModal
                show={showDeleteConfirm}
                onHide={() => setShowDeleteConfirm(false)}
                onConfirm={handleConfirmDelete}
                isRecurring={eventToEdit?.recurring || eventToEdit?.isRecurringInstance}
                isOriginal={eventToEdit?.recurring && !eventToEdit?.isRecurringInstance}
            />
        </>
    );
};

export default EventForm;
