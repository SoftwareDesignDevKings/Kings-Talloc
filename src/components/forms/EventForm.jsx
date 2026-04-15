'use client';

import React, { useState, useCallback } from 'react';
import { isAfter } from 'date-fns';
import { components } from 'react-select';
import BaseModal from '../modals/BaseModal.jsx';
import DeleteConfirmationModal from '../modals/DeleteConfirmationModal.jsx';
import EventDetailsSection from './EventFormSections/EventDetailsSection.jsx';
import ParticipantsSection from './EventFormSections/ParticipantsSection.jsx';
import SettingsSection from './EventFormSections/SettingsSection.jsx';
import StudentRequestSection from './EventFormSections/StudentRequestSection.jsx';
import { useEventFormData } from './useEventFormData';
import { useAppData } from '@/contexts/AppDataContext';
import {
    calendarEventHandleDelete,
    calendarEventCreateTeamsMeeting,
    calendarEventHandleTeamsMeetingUpdate,
} from '@/utils/calendarEvent';
import {
    getTeamsMeetingOccurrenceId,
    updateTeamsMeetingOccurrence,
} from '@/utils/msTeams';
import {
    updateEventInFirestore,
    createEventInFirestore,
    queueEmailNotification,
    deleteEventFromFirestore,
} from '@/firestore/firestoreOperations';
import { detachRecurringInstance } from '@/utils/calendarRecurringEvents';
import useAlert from '@/hooks/useAlert';

const EventForm = ({ mode, newEvent, setNewEvent, eventToEdit, setShowModal, userEmail, userRole }) => {
    const {
        setCalendarShifts,
        setCalendarAvailabilities,
        setCalendarStudentRequests,
    } = useAppData();
    // Derive mode flags
    const isView = mode === 'view';
    const isEdit = mode === 'edit';
    const isEditing = isEdit || isView; // for backward compat with existing logic

    // Tutors can edit workStatus even in view mode
    const isTutorPartialEdit = isView && userRole === 'tutor';

    const [selectedStaff, setSelectedStaff] = useState(newEvent.staff || []);
    const [selectedClasses, setSelectedClasses] = useState(newEvent.classes || []);
    const [selectedStudents, setSelectedStudents] = useState(newEvent.students || []);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { addAlert } = useAlert();

    // fetch form data using custom hook
    const { staffOptions, classOptions, studentOptions } = useEventFormData(newEvent);

    // memoided handlers to prevent unnecessary re-renders
    const handleInputChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setNewEvent((prev) => ({ ...prev, [name]: val }));
    }, [setNewEvent]);

    const handleStaffSelectChange = useCallback((selectedOptions) => {
        setSelectedStaff(selectedOptions);
        setNewEvent((prev) => ({ ...prev, staff: selectedOptions }));
    }, [setNewEvent]);

    const handleClassSelectChange = useCallback((selectedOptions) => {
        setSelectedClasses(selectedOptions);
        setNewEvent((prev) => ({ ...prev, classes: selectedOptions }));
    }, [setNewEvent]);

    const handleStudentSelectChange = useCallback((selectedOptions) => {
        setSelectedStudents(selectedOptions);
        setNewEvent((prev) => ({ ...prev, students: selectedOptions }));
    }, [setNewEvent]);

    const handleMinStudentsChange = useCallback((e) => {
        setNewEvent((prev) => ({ ...prev, minStudents: parseInt(e.target.value, 10) }));
    }, [setNewEvent]);

    const handleApprovalChange = useCallback((selectedOption) => {
        const approvalStatus = selectedOption.value;
        setNewEvent((prev) => ({ ...prev, approvalStatus }));
    }, [setNewEvent]);

    const validateDates = () => {
        const start = new Date(newEvent.start);
        const end = new Date(newEvent.end);
        if (!isAfter(end, start)) {
            addAlert('error', 'End date must be after the start date.');
            return false; // Validation failed
        }
        return true;
    };

    const validateForm = () => {

        // Validate dates first
        if (!validateDates()) {
            return false;
        }

        if (process.env.NODE_ENV !== 'development') {
            if (!newEvent.staff || newEvent.staff.length === 0) {
                addAlert('error', 'At least one tutor must be assigned to the event.');
            }
        }

        if (!newEvent.title) {
            addAlert('error', 'Title is required');
        }

        // Validate cannot make completed events recurring (but allow completing recurring instances since they get detached)
        if (newEvent.recurring && newEvent.workStatus === 'completed' && !eventToEdit?.isRecurringInstance) {
            addAlert('error', 'Cannot make completed events recurring.');
        }

        // Validate recurring event has occurrence number
        if (newEvent.recurring && !isEditing) {
            const count = Number(newEvent.occurenceNum);
            const maxOccurrences = newEvent.recurring === 'fortnightly' ? 5 : 10;

            if (!count || count < 2) {
                addAlert('error', 'Recurring events must have at least 2 occurrences.');
                return false;
            } else if (count > maxOccurrences) {
                addAlert('error', `Recurring shifts are capped at 10 weeks (max ${maxOccurrences} occurrences for ${newEvent.recurring} recurrence).`);
                return false;
            }
        }

        return true;
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return false; // Validation failed - don't close modal

        // Debug: Check if recurring instance flag is preserved
        console.log('EventForm onSubmit - eventToEdit:', {
            id: eventToEdit?.id,
            isRecurringInstance: eventToEdit?.isRecurringInstance,
            recurringEventId: eventToEdit?.recurringEventId,
            occurrenceIndex: eventToEdit?.occurrenceIndex,
            recurring: eventToEdit?.recurring,
            workStatus: eventToEdit?.workStatus,
        });

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
            workType: newEvent.workType || 'work',
            locationType: newEvent.locationType || '',
            subject: newEvent.subject || null,
            preference: newEvent.preference || null,
            recurring: newEvent.recurring || null,
            createTeamsMeeting: newEvent.createTeamsMeeting || false,
            occurenceNum: newEvent.occurenceNum || null,
            until: newEvent.until || null,
        };

        // Add 'until' date for recurring events
        if (eventData.recurring) {
            if (isEditing && newEvent.until) {
                eventData.until = newEvent.until;
            } else if (!isEditing) {
                // For new recurring events, explicitly set until to null
                eventData.until = null;
            }
        }

        try {
            if (isEditing) {
                if (eventToEdit.isStudentRequest && eventData.approvalStatus === 'approved') {
                    // Automatically create Teams meeting for approved student requests

                    await deleteEventFromFirestore(eventToEdit.id, 'studentEventRequests');
                    const docId = await createEventInFirestore(eventData);

                    await queueEmailNotification({ ...eventData, id: docId }, 'allocated', userEmail);

                    // Handle Teams meeting creation
                    await calendarEventCreateTeamsMeeting(docId, eventData, {
                        addAlert,
                    });
                } else if (eventToEdit.isStudentRequest) {
                    await updateEventInFirestore(eventToEdit.id, eventData, 'studentEventRequests');
                    await queueEmailNotification({ ...eventData, id: eventToEdit.id }, 'moved', userEmail, eventToEdit);
                } else if (eventToEdit.isRecurringInstance) {
                    // Detach from series and create a new standalone event
                    const newDocId = await detachRecurringInstance(eventToEdit, eventData);
                    await queueEmailNotification({ ...eventData, id: newDocId }, 'allocated', userEmail);

                    if (eventData.teamsEventId) {
                        try {
                            const attendeesEmailArr = [...(eventData.students || []), ...(eventData.staff || [])].map(
                                (p) => p.value || p,
                            );
                            const occurrenceId = await getTeamsMeetingOccurrenceId(
                                eventData.teamsEventId,
                                eventToEdit.start,
                            );
                            await updateTeamsMeetingOccurrence(
                                occurrenceId,
                                eventData.title,
                                eventData.description,
                                new Date(eventData.start).toISOString(),
                                new Date(eventData.end).toISOString(),
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
                    await queueEmailNotification({ ...eventData, id: eventToEdit.id }, 'moved', userEmail, eventToEdit);

                    // Handle Teams meeting update/delete
                    await calendarEventHandleTeamsMeetingUpdate(eventToEdit, eventData, {
                        addAlert,
                    });
                }
            } else {
                // Create single event (recurring or not)
                const docId = await createEventInFirestore(eventData);
                await queueEmailNotification({ ...eventData, id: docId }, 'allocated', userEmail);

                // Handle Teams meeting creation for new events
                if (eventData.approvalStatus === 'approved' || eventData.createTeamsMeeting) {
                    await calendarEventCreateTeamsMeeting(docId, eventData, {
                        addAlert,
                    });
                }
            }
            return true; // Success - allow modal to close
        } catch (error) {
            console.error('Failed to submit event:', error);
            addAlert('error', `Failed to submit event: ${error.message}`);
            return false; // Error - don't close modal
        }
    };

    const handleDeleteClick = async () => {
        // Check if this is a recurring event
        const isRecurring = eventToEdit.recurring || eventToEdit.isRecurringInstance;

        if (isRecurring) {
            // Show confirmation modal for recurring events
            setShowDeleteConfirm(true);
            return false; // Don't close main modal yet - wait for confirmation
        } else {
            // Delete non-recurring event directly
            try {
                await calendarEventHandleDelete(eventToEdit, 'this', {
                    setAllEvents: setCalendarShifts,
                    setAvailabilities: setCalendarAvailabilities,
                    setStudentRequests: setCalendarStudentRequests,
                    addAlert,
                });
                return true; // Success - allow modal to close
            } catch (error) {
                console.error('Failed to delete event:', error);
                addAlert('error', 'Failed to delete event');
                return false; // Error - don't close modal
            }
        }
    };

    const handleConfirmDelete = async (deleteOption) => {
        try {
            await calendarEventHandleDelete(eventToEdit, deleteOption, {
                setAllEvents: setCalendarShifts,
                setAvailabilities: setCalendarAvailabilities,
                setStudentRequests: setCalendarStudentRequests,
                addAlert,
            });
            setShowDeleteConfirm(false);
            setShowModal(false);
        } catch (error) {
            console.error('Failed to delete event:', error);
            addAlert('error', 'Failed to delete event');
            setShowDeleteConfirm(false);
            // Don't close main modal on error
        }
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
                <span>{getStatusIcon(data.locationType)}</span> {data.label}
            </components.Option>
        );
    };

    const customSingleValue = (props) => {
        const { data } = props;
        return (
            <components.SingleValue {...props}>
                <span>{getStatusIcon(data.locationType)}</span> {data.label}
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
                onSubmit={(isView && !isTutorPartialEdit) ? undefined : onSubmit}
                submitText={isTutorPartialEdit ? 'Save Status' : (isEdit ? 'Save Changes' : 'Add Event')}
                deleteButton={
                    isEdit
                        ? {
                              text: 'Delete',
                              onClick: handleDeleteClick,
                              variant: 'danger',
                          }
                        : null
                }
                showFooter={!isView || isTutorPartialEdit}
            >
                <div className="accordion" id="eventFormAccordion">
                    <EventDetailsSection
                        newEvent={newEvent}
                        setNewEvent={setNewEvent}
                        handleInputChange={handleInputChange}
                        readOnly={isView}
                        isEditing={isEditing}
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
                        userRole={userRole}
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
