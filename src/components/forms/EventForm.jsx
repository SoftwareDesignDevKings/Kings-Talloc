'use client';

import React, { useState } from 'react';
import { isAfter } from 'date-fns';
import { components } from 'react-select';
import BaseModal from '../modals/BaseModal.jsx';
import DeleteConfirmationModal from '../modals/DeleteConfirmationModal.jsx';
import EventDetailsSection from './EventFormSections/EventDetailsSection.jsx';
import ParticipantsSection from './EventFormSections/ParticipantsSection.jsx';
import SettingsSection from './EventFormSections/SettingsSection.jsx';
import StudentRequestSection from './EventFormSections/StudentRequestSection.jsx';
import { useEventFormData } from './useEventFormData';
import { useCalendarData } from '@/providers/CalendarDataProvider';
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
import useAlert from '@/hooks/useAlert';
import { CalendarEntityType } from '@/strategy/calendarStrategy.js';

const EventForm = ({ mode, newEvent, setNewEvent, eventToEdit, setShowModal }) => {
    const {
        setCalendarShifts: setAllEvents,
        setCalendarAvailabilities: setAvailabilities,
        setCalendarStudentRequests: setStudentRequests,
    } = useCalendarData();
    // Derive mode flags
    const isView = mode === 'view';
    const isEdit = mode === 'edit';
    const isEditing = isEdit || isView; // for backward compat with existing logic

    const [selectedStaff, setSelectedStaff] = useState(newEvent.staff || []);
    const [selectedClasses, setSelectedClasses] = useState(newEvent.classes || []);
    const [selectedStudents, setSelectedStudents] = useState(newEvent.students || []);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { addAlert } = useAlert();

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
            addAlert('error', 'End date must be after the start date.');
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
            addAlert('error', 'At least one tutor must be assigned to the event.');
            return false;
        }

        return true;
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        // Validate title
        if (!newEvent.title) {
            addAlert('error', 'Title is required');
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
                    // Automatically create Teams meeting for approved student requests
                    // eventData.createTeamsMeeting = true;

                    await deleteEventFromFirestore(eventToEdit.id, 'studentEventRequests');
                    const docId = await createEventInFirestore(eventData);

                    await addOrUpdateEventInQueue({ ...eventData, id: docId }, 'store');

                    // Handle Teams meeting creation
                    await calendarEventCreateTeamsMeeting(docId, eventData, {
                        addAlert,
                    });

                    setShowModal(false);
                } else if (eventToEdit.isStudentRequest) {
                    await updateEventInFirestore(eventToEdit.id, eventData, 'studentEventRequests');
                    await addOrUpdateEventInQueue({ ...eventData, id: eventToEdit.id }, 'update', eventToEdit);
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
                            addAlert('success', 'Event updated and Teams occurrence updated');
                        } catch (error) {
                            console.error('Failed to update Teams meeting occurrence:', error);
                            addAlert('error', `Event updated but Teams meeting failed: ${error.message}`);
                        }
                    }
                } else {
                    await updateEventInFirestore(eventToEdit.id, eventData);
                    await addOrUpdateEventInQueue({ ...eventData, id: eventToEdit.id }, 'update', eventToEdit);
                    setShowModal(false);

                    // Handle Teams meeting update/delete
                    await calendarEventHandleTeamsMeetingUpdate(eventToEdit, eventData, {
                        addAlert,
                    });
                }
            } else {
                const docId = await createEventInFirestore(eventData);
                await addOrUpdateEventInQueue({ ...eventData, id: docId }, 'store');
                setShowModal(false);

                // Handle Teams meeting creation for new events
                if (eventData.approvalStatus === 'approved' || eventData.createTeamsMeeting) {
                    await calendarEventCreateTeamsMeeting(docId, eventData, {
                        addAlert,
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
                setAllEvents,
                setAvailabilities,
                setStudentRequests,
                addAlert,
            });
            setShowModal(false);
        }
    };

    const handleConfirmDelete = (deleteOption) => {
        calendarEventHandleDelete(eventToEdit, deleteOption, {
            setAllEvents,
            setAvailabilities,
            setStudentRequests,
            addAlert,
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
                title={isView ? 'Event Details' : (isEdit ? 'Edit Event' : 'Add New Event')}
                size="lg"
                onSubmit={isView ? undefined : onSubmit}
                submitText={isEdit ? 'Save Changes' : 'Add Event'}
                deleteButton={
                    isEdit
                        ? {
                              text: 'Delete',
                              onClick: handleDeleteClick,
                              variant: 'danger',
                          }
                        : null
                }
                showFooter={!isView}
            >
                <div className="accordion" id="eventFormAccordion">
                    <EventDetailsSection
                        newEvent={newEvent}
                        setNewEvent={setNewEvent}
                        handleInputChange={handleInputChange}
                        readOnly={isView}
                    />

                    <ParticipantsSection
                        selectedStaff={selectedStaff}
                        handleStaffSelectChange={handleStaffSelectChange}
                        staffOptions={staffOptions}
                        customOption={customOption}
                        customSingleValue={customSingleValue}
                        selectedClasses={selectedClasses}
                        handleClassSelectChange={handleClassSelectChange}
                        classOptions={classOptions}
                        selectedStudents={selectedStudents}
                        handleStudentSelectChange={handleStudentSelectChange}
                        studentOptions={studentOptions}
                        readOnly={isView}
                    />

                    <SettingsSection
                        newEvent={newEvent}
                        setNewEvent={setNewEvent}
                        handleMinStudentsChange={handleMinStudentsChange}
                        workTypeOptions={workTypeOptions}
                        workStatusOptions={workStatusOptions}
                        readOnly={isView}
                    />

                    <StudentRequestSection
                        newEvent={newEvent}
                        handleApprovalChange={handleApprovalChange}
                        approvalOptions={approvalOptions}
                        readOnly={isView}
                    />
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
