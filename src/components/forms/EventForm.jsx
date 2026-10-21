'use client';
import { isStudentSession, workCategory, getParticipantEditError } from '@/lib/scheduling/eventRules';

import React, { useState, useCallback, useRef } from 'react';
import { isAfter } from 'date-fns';
import { StaffEventDialog, EventFormUIContext } from './EventFormSections/EventFormUI';
import styles from '@/styles/staffEventForm.module.css';
import DeleteConfirmationModal from '../modals/DeleteConfirmationModal.jsx';
import EventDetailsSection from './EventFormSections/EventDetailsSection.jsx';
import ParticipantsSection from './EventFormSections/ParticipantsSection.jsx';
import SettingsSection from './EventFormSections/SettingsSection.jsx';
import StudentRequestSection from './EventFormSections/StudentRequestSection.jsx';
import { useEventFormData } from './useEventFormData';
import useStudentSearch from '@/hooks/useStudentSearch';
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
    updateWorkStatusInFirestore,
    createScheduledEventInFirestore,
    queueEmailNotification,
} from '@/firestore/firestoreOperations';
import { detachRecurringInstance } from '@/utils/calendarRecurringEvents';
import useAlert from '@/hooks/useAlert';
import { useApprovalHandlers } from '@/hooks/useApprovalHandlers';

const EventForm = ({ mode, newEvent, setNewEvent, eventToEdit: initialEvent, setShowModal, userEmail, userRole }) => {
    const {
        calendarShifts,
        setCalendarShifts,
        setCalendarAvailabilities,
        setCalendarStudentRequests,
    } = useAppData();
    // Calendar modal props contain the live draft. Keep the originally opened
    // event stable for purpose validation, recurring edits and meeting updates.
    const [eventToEdit] = useState(initialEvent);
    // Derive mode flags
    const isView = mode === 'view';
    const isEdit = mode === 'edit';
    const isEditing = isEdit || isView; // for backward compat with existing logic

    // Tutors and coaches can edit workStatus even in view mode
    const isTutorPartialEdit = isView && (userRole === 'tutor' || userRole === 'coach');

    const [selectedStaff, setSelectedStaff] = useState(newEvent.staff || []);
    const [selectedClasses, setSelectedClasses] = useState(newEvent.classes || []);
    const [selectedStudents, setSelectedStudents] = useState(newEvent.students || []);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const busyRef = useRef(false);
    const dateTimeValidity = useRef({ start: true, end: true });
    const [portalContainer, setPortalContainer] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState(newEvent.createdByStudent && newEvent.approvalStatus === 'pending' ? 'studentRequest' : 'eventDetails');
    const [participantError, setParticipantError] = useState(null);
    const isRejectingRequest = eventToEdit?.isStudentRequest && newEvent.approvalStatus === 'denied';
    const removesPaidTime = isEditing && newEvent.workStatus !== eventToEdit?.workStatus
        && (eventToEdit?.workStatus === 'completed' || newEvent.workStatus === 'notAttended');
    const removesMeeting = isEditing && eventToEdit?.teamsEventId && eventToEdit.createTeamsMeeting && !newEvent.createTeamsMeeting;
    const { addAlert } = useAlert();
    const { handleApprove, handleReject } = useApprovalHandlers();

    // fetch form data using custom hook
    const { staffOptions, classOptions } = useEventFormData(newEvent);
    const studentSearch = useStudentSearch();

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

    const handleWorkTypeChange = useCallback((workType) => {
        setParticipantError(null);
        setNewEvent((prev) => ({ ...prev, workType }));
    }, [setNewEvent]);

    const handleClassSelectChange = useCallback((selectedOptions) => {
        setParticipantError(null);
        setSelectedClasses(selectedOptions);
        setNewEvent((prev) => ({ ...prev, classes: selectedOptions }));
    }, [setNewEvent]);

    const handleStudentSelectChange = useCallback((selectedOptions) => {
        setParticipantError(null);
        setSelectedStudents(selectedOptions);
        setNewEvent((prev) => ({ ...prev, students: selectedOptions }));
    }, [setNewEvent]);

    const handleApprovalChange = useCallback((selectedOption) => {
        const approvalStatus = selectedOption.value;
        setNewEvent((prev) => ({ ...prev, approvalStatus }));
    }, [setNewEvent]);

    const validateDates = () => {
        const start = new Date(newEvent.start);
        const end = new Date(newEvent.end);
        if (!dateTimeValidity.current.start || !dateTimeValidity.current.end || !isAfter(end, start)) {
            addAlert('error', 'End date must be after the start date.');
            return false; // Validation failed
        }
        return true;
    };

    const validateStaffRoles = () => {
        const workType = newEvent.workType;
        const requiredRole = workCategory(newEvent) === 'coaching' ? 'coach' : isStudentSession(newEvent) ? 'tutor' : null;
        if (!requiredRole) return true;
        const invalidStaff = (newEvent.staff || []).filter((staffMember) => {
            if (!staffMember.roles) return false;
            return !staffMember.roles.includes(requiredRole);
        });

        if (invalidStaff.length > 0) {
            const names = invalidStaff.map((s) => s.label).join(', ');
            addAlert('error', `The following staff do not have the ${requiredRole} role: ${names}`);
            return false;
        }
        return true;
    };

    const validateForm = () => {

        const isDenial = eventToEdit?.isStudentRequest && newEvent.approvalStatus === 'denied';
        const editError = isEditing && !isDenial ? getParticipantEditError(eventToEdit, newEvent) : null;
        setParticipantError(editError);
        if (editError) return false;

        // Validate dates first
        if (!validateDates()) {
            return false;
        }

        if (process.env.NODE_ENV !== 'development') {
            if (!newEvent.staff || newEvent.staff.length === 0) {
                addAlert('error', 'At least one tutor must be assigned to the event.');
                return false;
            }
        }

        if (!validateStaffRoles()) {
            return false;
        }

        if (!newEvent.title) {
            addAlert('error', 'Title is required');
            return false;
        }

        // Validate cannot make completed events recurring (but allow completing recurring instances since they get detached)
        if (newEvent.recurring && newEvent.workStatus === 'completed' && !eventToEdit?.isRecurringInstance) {
            addAlert('error', 'Cannot make completed events recurring.');
            return false;
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

    const queueSavedEventEmail = async (...args) => {
        try { await queueEmailNotification(...args); }
        catch (error) { addAlert('warning', `Event saved, but the allocation email could not be queued: ${error.message}`); }
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (busyRef.current) return false;

        if (removesPaidTime && !window.confirm('Change this session’s completion status? This can reduce the hours counted for payment.')) return false;
        if (removesMeeting && !window.confirm('Remove this session’s Teams meeting? The existing meeting and its joining link will be deleted.')) return false;
        busyRef.current = true;
        setIsSubmitting(true);
        try {
        // Tutors/coaches may only update workStatus — send only that field to satisfy
        // the Firestore rule: hasOnly(['workStatus']). Skip full form validation: rules
        // like "can't mark a recurring event completed" are admin/teacher concerns and
        // must not gate the tutor/coach single-field write path.
        if (isTutorPartialEdit) {
            try {
                if (eventToEdit.isRecurringInstance) await detachRecurringInstance(eventToEdit, { workStatus: newEvent.workStatus || 'notCompleted' });
                else await updateWorkStatusInFirestore(eventToEdit.id, newEvent.workStatus || 'notCompleted', eventToEdit.revision || 0);
                return true;
            } catch (error) {
                console.error('Failed to update work status:', error);
                addAlert('error', `Failed to update work status: ${error.message}`);
                return false;
            }
        }

        if (!validateForm()) return false; // Validation failed - don't close modal

        const isApprovingStudentRequest = isEditing
            && eventToEdit?.isStudentRequest
            && (newEvent.approvalStatus || 'pending') === 'approved';

        const eventData = {
            title: newEvent.title || '',
            start: new Date(newEvent.start),
            end: new Date(newEvent.end),
            description: newEvent.description || '',
            staff: newEvent.staff || [],
            classes: newEvent.classes || [],
            students: newEvent.students || [],
            additionalStudents: [],
            createdByStudent: newEvent.createdByStudent || false,
            approvalStatus: newEvent.approvalStatus || 'pending',
            workStatus: newEvent.workStatus || 'notCompleted',
            workType: workCategory(newEvent),
            locationType: newEvent.locationType || '',
            subject: newEvent.subject || null,
            preference: newEvent.preference || null,
            sessionTopics: newEvent.sessionTopics || '',
            recurring: newEvent.recurring || null,
            createTeamsMeeting: isApprovingStudentRequest || newEvent.createTeamsMeeting || false,
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
                    return await handleApprove(eventToEdit, eventData);
                } else if (eventToEdit.isStudentRequest && eventData.approvalStatus === 'denied') {
                    return await handleReject(eventToEdit.id);
                } else if (eventToEdit.isStudentRequest) {
                    await updateEventInFirestore(eventToEdit.id, eventData, 'studentEventRequests', eventToEdit.revision || 0);
                    await queueSavedEventEmail({ ...eventData, id: eventToEdit.id }, 'moved', userEmail, eventToEdit);
                } else if (eventToEdit.isRecurringInstance) {
                    // Detach from series and create a new standalone event
                    const newDocId = await detachRecurringInstance(eventToEdit, eventData);
                    await queueSavedEventEmail({ ...eventData, id: newDocId }, 'allocated', userEmail);

                    if (eventToEdit.teamsEventId) {
                        try {
                            const attendeesEmailArr = [...(eventData.students || []), ...(eventData.staff || [])].map(
                                (p) => p.value || p,
                            );
                            const occurrenceId = await getTeamsMeetingOccurrenceId(
                                eventToEdit.teamsEventId,
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
                    const result = await updateEventInFirestore(eventToEdit.id, eventData, 'shifts', eventToEdit.revision || 0);
                    const savedEvent = result?.eventData || eventData;
                    await queueSavedEventEmail({ ...savedEvent, id: eventToEdit.id }, 'moved', userEmail, eventToEdit);

                    // Handle Teams meeting update/delete
                    await calendarEventHandleTeamsMeetingUpdate(eventToEdit, savedEvent, {
                        addAlert,
                    });
                }
            } else {
                // Create single event (recurring or not)
                const result = await createScheduledEventInFirestore(eventData);
                const docId = result.id;
                const savedEvent = result.eventData || eventData;
                await queueSavedEventEmail({ ...savedEvent, id: docId }, 'allocated', userEmail);

                // Handle Teams meeting creation for new events
                if (savedEvent.approvalStatus === 'approved' || savedEvent.createTeamsMeeting) {
                    await calendarEventCreateTeamsMeeting(docId, savedEvent, {
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
        } catch (error) {
            console.error('Failed to submit event:', error);
            addAlert('error', `Failed to submit event: ${error.message}`);
            return false;
        } finally {
            busyRef.current = false;
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = async () => {
        if (isSubmitting) return false;
        setShowDeleteConfirm(true);
        return false; // Keep the editor until deletion is explicitly confirmed.
    };

    const handleConfirmDelete = async (deleteOption) => {
        if (busyRef.current) return;
        busyRef.current = true;
        setIsSubmitting(true);
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
        } finally {
            busyRef.current = false;
            setIsSubmitting(false);
        }
    };

    const approvalOptions = [
        { value: 'approved', label: 'Approve' },
        { value: 'denied', label: 'Deny' },
    ];

    const workStatusOptions = [
        { value: 'notCompleted', label: 'Not completed' },
        { value: 'completed', label: 'Completed' },
        { value: 'notAttended', label: "Student didn't attend" },
    ];

    const workTypeOptions = [
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

    const renderStaffOption = option => <><span>{getStatusIcon(option.locationType)}</span> {option.label}</>;

    return (
        <>
            <StaffEventDialog
                show={!showDeleteConfirm}
                onHide={() => { if (!busyRef.current) setShowModal(false); }}
                title={isView ? 'Event details' : (isEdit ? 'Edit event' : 'Add new event')}
                setPortalContainer={setPortalContainer}
                menuOpen={menuOpen}
                onSubmit={(isView && !isTutorPartialEdit) ? undefined : onSubmit}
                submitText={isRejectingRequest ? 'Reject request' : isTutorPartialEdit ? 'Save status' : (isEdit ? 'Save changes' : 'Add event')}
                submitVariant={isRejectingRequest || removesPaidTime || removesMeeting ? 'danger' : 'outline-primary'}
                loading={isSubmitting}
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
                {participantError && <div className={styles.warning} role="alert">{participantError}</div>}
                <EventFormUIContext.Provider value={{ portalContainer, setMenuOpen, dateTimeValidity, busy: isSubmitting, activeSection, setActiveSection }}>
                <div className={styles.sections}>
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
                        renderStaffOption={renderStaffOption}
                        selectedClasses={selectedClasses}
                        handleClassSelectChange={handleClassSelectChange}
                        classOptions={classOptions}
                        selectedStudents={selectedStudents}
                        handleStudentSelectChange={handleStudentSelectChange}
                        studentOptions={studentSearch.options}
                        onStudentSearch={studentSearch.search}
                        studentNoOptionsMessage={studentSearch.noOptionsMessage}
                        readOnly={isView}
                    >
                        {newEvent.classes?.length > 0 && !newEvent.students?.length && !newEvent.additionalStudents?.length && !newEvent.studentParticipantsResolved && (
                            <p className="text-warning-emphasis mt-4" role="status">This legacy class booking has unresolved students. It remains occupied; check its participants before changing it.</p>
                        )}
                    </ParticipantsSection>
                    <SettingsSection
                        newEvent={newEvent}
                        setNewEvent={setNewEvent}
                        onWorkTypeChange={handleWorkTypeChange}
                        workTypeOptions={workTypeOptions}
                        workStatusOptions={workStatusOptions}
                        readOnly={isView}
                        userRole={userRole}
                    />

                    <StudentRequestSection
                        newEvent={newEvent}
                        handleApprovalChange={handleApprovalChange}
                        approvalOptions={approvalOptions}
                        readOnly={isView || !eventToEdit?.isStudentRequest}
                    />
                </div>
                </EventFormUIContext.Provider>
            </StaffEventDialog>

            <DeleteConfirmationModal
                show={showDeleteConfirm}
                loading={isSubmitting}
                onHide={() => { if (!busyRef.current) setShowDeleteConfirm(false); }}
                onConfirm={handleConfirmDelete}
                isStudentRequest={Boolean(eventToEdit?.isStudentRequest)}
                isRecurring={eventToEdit?.recurring || eventToEdit?.isRecurringInstance}
                isOriginal={eventToEdit?.recurring && !eventToEdit?.isRecurringInstance}
            />
        </>
    );
};

export default EventForm;
