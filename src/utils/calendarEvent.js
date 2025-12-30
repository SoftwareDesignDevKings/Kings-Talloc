/**
 * Calendar event functions
 * All functions prefixed with 'calendarEvent'
 */

import {
    updateEventInFirestore,
    createEventInFirestore,
    deleteEventFromFirestore,
    addEventException,
    setRecurringUntilDate,
    removeEventFromQueue,
    addOrUpdateEventInQueue,
} from '@/firestore/firestoreOperations';
import {
    createTeamsMeeting,
    updateTeamsMeeting,
    deleteTeamsMeeting,
    getTeamsMeetingOccurrenceId,
    updateTeamsMeetingOccurrence,
    deleteTeamsMeetingOccurrence,
    updateTeamsMeetingRecurrenceEndDate,
} from '@/utils/msTeams';

/**
 * Determines event type and Firestore collection name
 */
export const calendarEventGetType = (event) => {
    const isAvailability = !!event.tutor;
    const isStudentRequest = !!event.isStudentRequest;

    let collectionName = 'shifts';
    if (isAvailability) {
        collectionName = 'tutorAvailabilities';
    } else if (isStudentRequest) {
        collectionName = 'studentEventRequests';
    }

    return { isAvailability, isStudentRequest, collectionName };
};

/**
 * Check if user owns an event
 */
export const calendarEventCheckOwnership = (event, userEmail, userRole) => {
    if (event.tutor) {
        return userRole === 'tutor' && event.tutor === userEmail;
    }

    if (event.isStudentRequest) {
        return event.students?.some((s) => s.value === userEmail || s === userEmail);
    }

    return userRole === 'teacher';
};

/**
 * Check if user can drag/resize event
 */
export const calendarEventCanModify = (event, userEmail, userRole) => {
    if (userRole === 'tutor') {
        return event.tutor === userEmail;
    }

    if (userRole === 'student') {
        if (!event.isStudentRequest) return false;
        return event.students?.some((s) => s.value === userEmail || s === userEmail);
    }

    return userRole === 'teacher' && !event.isStudentRequest;
};

/**
 * Get default event data based on user role
 */
export const calendarEventGetDefaults = (slotInfo, userRole, userEmail) => {
    const start = slotInfo.start;
    let end = slotInfo.end;

    // Default to 1 hour if slot is 30 minutes
    const duration = (end - start) / (1000 * 60);
    if (duration === 30) {
        end = new Date(start.getTime() + 60 * 60 * 1000);
    }

    if (userRole === 'tutor') {
        return {
            title: 'Availability',
            start,
            end,
            tutor: userEmail,
            workType: 'tutoringOrWork',
            locationType: '',
        };
    }

    if (userRole === 'student') {
        return {
            title: '',
            start,
            end,
            description: '',
            staff: [],
            students: [{ value: userEmail, label: userEmail }],
            confirmationRequired: false,
            createdByStudent: true,
            approvalStatus: 'pending',
            workStatus: 'notCompleted',
            locationType: '',
        };
    }

    // Teacher
    return {
        title: '',
        start,
        end,
        description: '',
        confirmationRequired: false,
        staff: [],
        classes: [],
        students: [],
        tutorResponses: [],
        studentResponses: [],
        minStudents: 0,
        workStatus: 'notCompleted',
        workType: 'work',
        locationType: '',
    };
};

/**
 * Filter events based on role and filters
 */
export const calendarEventFilter = (allEvents, { userRole, userEmail, filters }) => {
    let filtered = [...allEvents];
    const { visibility, tutors } = filters;

    if (userRole === 'tutor') {
        filtered = filtered.filter((event) =>
            event.staff.some((staff) => staff.value === userEmail),
        );

        if (visibility?.hideOwnAvailabilities) {
            filtered = filtered.filter((event) => event.tutor !== userEmail);
        }
    }

    if ((userRole === 'tutor' || userRole === 'teacher') && visibility?.hideDeniedStudentEvents) {
        filtered = filtered.filter(
            (event) => !(event.createdByStudent && event.approvalStatus === 'denied'),
        );
    }

    if (tutors?.length > 0) {
        const selectedTutorValues = tutors.map((tutor) => tutor.value);
        filtered = filtered.filter((event) =>
            event.staff.some((staff) => selectedTutorValues.includes(staff.value)),
        );
    }

    if (userRole === 'teacher') {
        if (!visibility?.showTutoringEvents) {
            filtered = filtered.filter((event) => event.workType !== 'tutoring');
        }
        if (!visibility?.showCoachingEvents) {
            filtered = filtered.filter((event) => event.workType !== 'coaching');
        }
    }

    return filtered;
};

/**
 * Update event state optimistically
 */
export const calendarEventUpdateState = (
    eventId,
    updatedEvent,
    isAvailability,
    isStudentRequest,
    { setAllEvents, setAvailabilities, setStudentRequests },
) => {
    if (isAvailability) {
        setAvailabilities((prev) =>
            prev.map((avail) => (avail.id === eventId ? updatedEvent : avail)),
        );
    } else if (isStudentRequest) {
        setStudentRequests((prev) => prev.map((req) => (req.id === eventId ? updatedEvent : req)));
    } else {
        setAllEvents((prev) => prev.map((evt) => (evt.id === eventId ? updatedEvent : evt)));
    }
};

/**
 * Revert event state on error
 */
export const calendarEventRevertState = (
    previousEvents,
    previousAvailabilities,
    previousStudentRequests,
    isAvailability,
    isStudentRequest,
    { setAllEvents, setAvailabilities, setStudentRequests },
) => {
    if (isAvailability) {
        setAvailabilities(previousAvailabilities);
    } else if (isStudentRequest) {
        setStudentRequests(previousStudentRequests);
    } else {
        setAllEvents(previousEvents);
    }
};

/**
 * Update Teams meeting if exists
 */
export const calendarEventUpdateTeamsMeeting = async (
    event,
    start,
    end,
    isAvailability,
    isStudentRequest,
    { addAlert },
) => {
    if (!event.teamsEventId || isAvailability || isStudentRequest) return;

    const subject = event.title;
    const description = event.description || '';
    const startTime = new Date(start).toISOString();
    const endTime = new Date(end).toISOString();
    const attendees = [...(event.students || []), ...(event.staff || [])].map((p) => p.value || p);

    try {
        await updateTeamsMeeting(
            event.teamsEventId,
            subject,
            description,
            startTime,
            endTime,
            attendees,
        );
        addAlert('success', 'Teams meeting updated successfully');
    } catch (error) {
        console.error('Failed to update Teams meeting:', error);
        addAlert('error', `Failed to update Teams meeting: ${error.message}`);
    }
};

/**
 * Create Teams meeting for a new event
 */
export const calendarEventCreateTeamsMeeting = async (eventId, eventData, { addAlert }) => {

    if (!eventData.createTeamsMeeting) {
        return;
    }

    const attendeesEmailArr = [...(eventData.students || []), ...(eventData.staff || [])].map(
        (p) => p.value || p,
    );

    // Build recurrence options if event is recurring
    const recurrenceOptions = eventData.recurring
        ? {
              recurring: eventData.recurring,
              until: eventData.until,
          }
        : null;

    try {
        const result = await createTeamsMeeting(
            eventData.title,
            eventData.description || '',
            new Date(eventData.start).toISOString(),
            new Date(eventData.end).toISOString(),
            attendeesEmailArr,
            recurrenceOptions,
        );

        await updateEventInFirestore(eventId, {
            teamsEventId: result.teamsEventId,
            teamsJoinUrl: result.joinUrl,
        });

        addAlert(
            'success',
            eventData.recurring
                ? 'Recurring event and Teams meeting series created successfully'
                : 'Teams meeting created successfully'
        );
    } catch (error) {
        console.error('Failed to create Teams meeting:', error);
        addAlert('error', `Failed to create Teams meeting: ${error.message}`);
    }
};

/**
 * Handle Teams meeting when updating an existing event
 */
export const calendarEventHandleTeamsMeetingUpdate = async (eventToEdit, eventData, { addAlert }) => {
    const attendeesEmailArr = [...(eventData.students || []), ...(eventData.staff || [])].map(
        (p) => p.value || p,
    );

    // Case 1: User unchecked "Create Teams Meeting" - delete existing meeting
    if (!eventData.createTeamsMeeting && eventToEdit.teamsEventId) {
        try {
            await deleteTeamsMeeting(eventToEdit.teamsEventId);
            await updateEventInFirestore(eventToEdit.id, {
                teamsEventId: null,
                teamsJoinUrl: null,
            });
            addAlert('success', 'Teams meeting deleted successfully');
        } catch (error) {
            console.error('Failed to delete Teams meeting:', error);
            addAlert('error', `Failed to delete Teams meeting: ${error.message}`);
        }
        return;
    }

    // Case 2: Event needs Teams meeting (approval or createTeamsMeeting flag)
    if (
        (eventData.approvalStatus === 'approved' && eventToEdit.approvalStatus !== 'approved') ||
        eventData.createTeamsMeeting
    ) {
        if (eventToEdit.teamsEventId) {
            // Update existing Teams meeting
            try {
                // Build recurrence options if event is recurring
                const recurrenceOptions = eventData.recurring
                    ? {
                          recurring: eventData.recurring,
                          until: eventData.until,
                      }
                    : null;

                await updateTeamsMeeting(
                    eventToEdit.teamsEventId,
                    eventData.title,
                    eventData.description || '',
                    new Date(eventData.start).toISOString(),
                    new Date(eventData.end).toISOString(),
                    attendeesEmailArr,
                    recurrenceOptions,
                );
                addAlert('success', 'Teams meeting updated successfully');
            } catch (error) {
                console.error('Failed to update Teams meeting:', error);
                addAlert('error', `Failed to update Teams meeting: ${error.message}`);
            }
        } else {
            // Create new Teams meeting
            try {
                const result = await createTeamsMeeting(
                    eventData.title,
                    eventData.description || '',
                    new Date(eventData.start).toISOString(),
                    new Date(eventData.end).toISOString(),
                    attendeesEmailArr,
                );
                await updateEventInFirestore(eventToEdit.id, {
                    teamsEventId: result.teamsEventId,
                    teamsJoinUrl: result.joinUrl,
                });
                addAlert('success', 'Teams meeting created successfully');
            } catch (error) {
                console.error('Failed to create Teams meeting:', error);
                addAlert('error', `Failed to create Teams meeting: ${error.message}`);
            }
        }
    }
};

/**
 * Handle event drop (drag and drop)
 */
export const calendarEventHandleDrop = async (
    { event, start, end },
    updateOption,
    {
        userRole,
        userEmail,
        allEvents,
        availabilities,
        studentRequests,
        setAllEvents,
        setAvailabilities,
        setStudentRequests,
        addAlert,
    },
) => {
    const { isAvailability, isStudentRequest, collectionName } = calendarEventGetType(event);

    // Permission checks
    if (userRole === 'student') {
        if (!isStudentRequest) return;
        const isOwnRequest = event.students?.some((s) => (s.value || s) === userEmail);
        if (!isOwnRequest) return;
    }

    if (userRole === 'tutor' && !isAvailability) return;

    const duration = event.end - event.start;
    const updatedEnd = new Date(start.getTime() + duration);
    const updatedEvent = { ...event, start, end: updatedEnd };

    const previousEvents = [...allEvents];
    const previousAvailabilities = [...availabilities];
    const previousStudentRequests = [...studentRequests];

    calendarEventUpdateState(event.id, updatedEvent, isAvailability, isStudentRequest, {
        setAllEvents,
        setAvailabilities,
        setStudentRequests,
    });

    try {
        if (event.isRecurringInstance && event.recurringEventId) {
            if (updateOption === 'this') {
                await addEventException(
                    event.recurringEventId,
                    event.occurrenceIndex,
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
                    teamsEventId,
                    teamsJoinUrl,
                    ...eventWithoutRecurringFields
                } = event;
                const newEvent = {
                    ...eventWithoutRecurringFields,
                    start: new Date(start),
                    end: updatedEnd,
                };
                const newDocId = await createEventInFirestore(newEvent, collectionName);

                // Update the Teams occurrence for this instance
                if (teamsEventId && !isAvailability && !isStudentRequest) {
                    try {
                        const attendees = [
                            ...(event.students || []),
                            ...(event.staff || []),
                        ].map((p) => p.value || p);

                        // Get the occurrence ID for this specific instance
                        const occurrenceId = await getTeamsMeetingOccurrenceId(
                            teamsEventId,
                            event.start,
                        );

                        // Update this specific occurrence
                        await updateTeamsMeetingOccurrence(
                            occurrenceId,
                            event.title,
                            event.description || '',
                            new Date(start).toISOString(),
                            updatedEnd.toISOString(),
                            attendees,
                        );

                        addAlert('success', 'Event moved and Teams occurrence updated');
                    } catch (error) {
                        console.error('Failed to update Teams meeting for instance:', error);
                        addAlert('error', `Event moved but Teams meeting failed: ${error.message}`);
                    }
                }
            } else if (updateOption === 'thisAndFuture') {
                const untilDate = new Date(event.start);
                untilDate.setDate(untilDate.getDate() - 1);
                await setRecurringUntilDate(event.recurringEventId, untilDate, collectionName);
                const {
                    id,
                    recurringEventId,
                    isRecurringInstance,
                    occurrenceIndex,
                    eventExceptions,
                    teamsEventId,
                    teamsJoinUrl,
                    ...eventWithoutInstanceFields
                } = event;
                const newEvent = {
                    ...eventWithoutInstanceFields,
                    start: new Date(start),
                    end: updatedEnd,
                };
                const newDocId = await createEventInFirestore(newEvent, collectionName);

                // Update Teams: end the old series and create a new one
                if (teamsEventId && !isAvailability && !isStudentRequest) {
                    try {
                        const attendees = [
                            ...(event.students || []),
                            ...(event.staff || []),
                        ].map((p) => p.value || p);

                        // End the original series one day before this occurrence
                        await updateTeamsMeetingRecurrenceEndDate(teamsEventId, untilDate);

                        // Create a new Teams meeting series for the new recurring event
                        const recurrenceOptions = {
                            recurring: event.recurring,
                            until: event.until,
                        };

                        const result = await createTeamsMeeting(
                            event.title,
                            event.description || '',
                            new Date(start).toISOString(),
                            updatedEnd.toISOString(),
                            attendees,
                            recurrenceOptions,
                        );

                        // Store the NEW teamsEventId with the new recurring event
                        await updateEventInFirestore(newDocId, {
                            teamsEventId: result.teamsEventId,
                            teamsJoinUrl: result.joinUrl,
                        });
                        addAlert('success', 'Future events moved and new Teams series created');
                    } catch (error) {
                        console.error('Failed to update Teams meeting for future events:', error);
                        addAlert(
                            'error',
                            `Events moved but Teams meeting failed: ${error.message}`
                        );
                    }
                }
            }
        } else {
            await updateEventInFirestore(
                event.id,
                {
                    start: new Date(start),
                    end: updatedEnd,
                },
                collectionName,
            );

            await calendarEventUpdateTeamsMeeting(
                event,
                start,
                updatedEnd,
                isAvailability,
                isStudentRequest,
                { addAlert },
            );
        }
    } catch (error) {
        console.error('Failed to update event:', error);
        calendarEventRevertState(
            previousEvents,
            previousAvailabilities,
            previousStudentRequests,
            isAvailability,
            isStudentRequest,
            { setAllEvents, setAvailabilities, setStudentRequests },
        );
    }
};

/**
 * Handle event resize
 */
export const calendarEventHandleResize = async (
    { event, start, end },
    updateOption,
    {
        userRole,
        userEmail,
        allEvents,
        availabilities,
        studentRequests,
        setAllEvents,
        setAvailabilities,
        setStudentRequests,
        addAlert,
    },
) => {
    const { isAvailability, isStudentRequest, collectionName } = calendarEventGetType(event);

    // Permission checks
    if (userRole === 'student') {
        if (!isStudentRequest) return;
        const isOwnRequest = event.students?.some((s) => (s.value || s) === userEmail);
        if (!isOwnRequest) return;
    }

    if (userRole === 'tutor' && !isAvailability) return;

    const updatedEvent = { ...event, start, end };

    const previousEvents = [...allEvents];
    const previousAvailabilities = [...availabilities];
    const previousStudentRequests = [...studentRequests];

    calendarEventUpdateState(event.id, updatedEvent, isAvailability, isStudentRequest, {
        setAllEvents,
        setAvailabilities,
        setStudentRequests,
    });

    try {
        if (event.isRecurringInstance && event.recurringEventId) {
            if (updateOption === 'this') {
                await addEventException(
                    event.recurringEventId,
                    event.occurrenceIndex,
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
                    teamsEventId,
                    teamsJoinUrl,
                    ...eventWithoutRecurringFields
                } = event;
                const newEvent = {
                    ...eventWithoutRecurringFields,
                    start: new Date(start),
                    end: new Date(end),
                };
                const newDocId = await createEventInFirestore(newEvent, collectionName);

                // Update the Teams occurrence for this instance
                if (teamsEventId && !isAvailability && !isStudentRequest) {
                    try {
                        const attendees = [
                            ...(event.students || []),
                            ...(event.staff || []),
                        ].map((p) => p.value || p);

                        // Get the occurrence ID for this specific instance
                        const occurrenceId = await getTeamsMeetingOccurrenceId(
                            teamsEventId,
                            event.start,
                        );

                        // Update this specific occurrence
                        await updateTeamsMeetingOccurrence(
                            occurrenceId,
                            event.title,
                            event.description || '',
                            new Date(start).toISOString(),
                            new Date(end).toISOString(),
                            attendees,
                        );

                        addAlert('success', 'Event resized and Teams occurrence updated');
                    } catch (error) {
                        console.error('Failed to update Teams meeting for instance:', error);
                        addAlert('error', `Event resized but Teams meeting failed: ${error.message}`);
                    }
                }
            } else if (updateOption === 'thisAndFuture') {
                const untilDate = new Date(event.start);
                untilDate.setDate(untilDate.getDate() - 1);
                await setRecurringUntilDate(event.recurringEventId, untilDate, collectionName);
                const {
                    id,
                    recurringEventId,
                    isRecurringInstance,
                    occurrenceIndex,
                    eventExceptions,
                    teamsEventId,
                    teamsJoinUrl,
                    ...eventWithoutInstanceFields
                } = event;
                const newEvent = {
                    ...eventWithoutInstanceFields,
                    start: new Date(start),
                    end: new Date(end),
                };
                const newDocId = await createEventInFirestore(newEvent, collectionName);

                // Update Teams: end the old series and create a new one
                if (teamsEventId && !isAvailability && !isStudentRequest) {
                    try {
                        const attendees = [
                            ...(event.students || []),
                            ...(event.staff || []),
                        ].map((p) => p.value || p);

                        // End the original series one day before this occurrence
                        await updateTeamsMeetingRecurrenceEndDate(teamsEventId, untilDate);

                        // Create a new Teams meeting series for the new recurring event
                        const recurrenceOptions = {
                            recurring: event.recurring,
                            until: event.until,
                        };

                        const result = await createTeamsMeeting(
                            event.title,
                            event.description || '',
                            new Date(start).toISOString(),
                            new Date(end).toISOString(),
                            attendees,
                            recurrenceOptions,
                        );

                        // Store the NEW teamsEventId with the new recurring event
                        await updateEventInFirestore(newDocId, {
                            teamsEventId: result.teamsEventId,
                            teamsJoinUrl: result.joinUrl,
                        });
                        addAlert('success', 'Future events resized and new Teams series created');
                    } catch (error) {
                        console.error('Failed to update Teams meeting for future events:', error);
                        addAlert(
                            'error',
                            `Events resized but Teams meeting failed: ${error.message}`
                        );
                    }
                }
            }
        } else {
            await updateEventInFirestore(
                event.id,
                {
                    start: new Date(start),
                    end: new Date(end),
                },
                collectionName,
            );

            await calendarEventUpdateTeamsMeeting(
                event,
                start,
                end,
                isAvailability,
                isStudentRequest,
                {
                    addAlert,
                },
            );
        }
    } catch (error) {
        console.error('Failed to update event:', error);
        calendarEventRevertState(
            previousEvents,
            previousAvailabilities,
            previousStudentRequests,
            isAvailability,
            isStudentRequest,
            { setAllEvents, setAvailabilities, setStudentRequests },
        );
    }
};

/**
 * Handle event deletion
 */
export const calendarEventHandleDelete = async (
    eventToDelete,
    deleteOption,
    { setAllEvents, setAvailabilities, setStudentRequests, addAlert },
) => {
    if (!eventToDelete || !eventToDelete.id) return;

    const { isAvailability, isStudentRequest, collectionName } =
        calendarEventGetType(eventToDelete);
    const recurringEventId = eventToDelete.recurringEventId;
    const hasRecurring = !!eventToDelete.recurring;

    try {
        if (hasRecurring && deleteOption === 'all') {
            await deleteEventFromFirestore(eventToDelete.id, collectionName);
            await removeEventFromQueue(eventToDelete.id);

            // Delete Teams meeting if the original recurring event had one
            if (eventToDelete.teamsEventId && !isAvailability && !isStudentRequest) {
                try {
                    await deleteTeamsMeeting(eventToDelete.teamsEventId);
                    addAlert('success', 'Recurring event and Teams meeting deleted successfully');
                } catch (error) {
                    console.error('Failed to delete Teams meeting:', error);
                    addAlert('error', `Event deleted but Teams meeting failed: ${error.message}`);
                }
            }

            setAllEvents((prev) =>
                prev.filter(
                    (event) =>
                        event.id !== eventToDelete.id &&
                        event.recurringEventId !== eventToDelete.id,
                ),
            );
        } else if (recurringEventId && deleteOption === 'thisAndFuture') {
            const untilDate = new Date(eventToDelete.start);
            untilDate.setDate(untilDate.getDate() - 1);
            await setRecurringUntilDate(recurringEventId, untilDate, collectionName);

            // Update the end date of the Teams meeting series
            if (eventToDelete.teamsEventId && !isAvailability && !isStudentRequest) {
                try {
                    await updateTeamsMeetingRecurrenceEndDate(
                        eventToDelete.teamsEventId,
                        untilDate,
                    );
                    addAlert('success', 'Future occurrences and Teams meeting series updated');
                } catch (error) {
                    console.error('Failed to update Teams meeting recurrence:', error);
                    addAlert(
                        'error',
                        `Future occurrences deleted but updating Teams meeting failed: ${error.message}`
                    );
                }
            } else {
                addAlert('success', 'Future occurrences deleted successfully');
            }

            setAllEvents((prev) =>
                prev.filter((event) => {
                    if (
                        event.recurringEventId !== recurringEventId &&
                        event.id !== recurringEventId
                    )
                        return true;
                    if (event.id === recurringEventId) return true;
                    if (
                        event.recurringEventId === recurringEventId &&
                        event.occurrenceIndex >= eventToDelete.occurrenceIndex
                    )
                        return false;
                    return true;
                }),
            );
        } else if (recurringEventId) {
            // Delete just this instance
            await addEventException(
                recurringEventId,
                eventToDelete.occurrenceIndex,
                collectionName,
            );

            // Delete the specific Teams meeting occurrence
            if (eventToDelete.teamsEventId && !isAvailability && !isStudentRequest) {
                try {
                    // Get the occurrence ID for this specific instance
                    const occurrenceId = await getTeamsMeetingOccurrenceId(
                        eventToDelete.teamsEventId,
                        eventToDelete.start,
                    );
                    // Delete this specific occurrence
                    await deleteTeamsMeetingOccurrence(occurrenceId);
                    addAlert('success', 'Event instance and Teams occurrence deleted successfully');
                } catch (error) {
                    console.error('Failed to delete Teams meeting occurrence:', error);
                    addAlert(
                        'error',
                        `Event instance deleted but Teams occurrence deletion failed: ${error.message}`
                    );
                }
            } else {
                addAlert('success', 'Event instance deleted successfully');
            }

            setAllEvents((prev) => prev.filter((event) => event.id !== eventToDelete.id));
        } else {
            await deleteEventFromFirestore(eventToDelete.id, collectionName);

            if (eventToDelete.teamsEventId && !isAvailability && !isStudentRequest) {
                try {
                    await deleteTeamsMeeting(eventToDelete.teamsEventId);
                    addAlert('success', 'Event and Teams meeting deleted successfully');
                } catch (error) {
                    console.error('Failed to delete Teams meeting:', error);
                    addAlert('error', `Event deleted but Teams meeting failed: ${error.message}`);
                }
            }

            if (isAvailability) {
                setAvailabilities((prev) => prev.filter((a) => a.id !== eventToDelete.id));
            } else if (isStudentRequest) {
                setStudentRequests((prev) => prev.filter((r) => r.id !== eventToDelete.id));
            } else {
                setAllEvents((prev) => prev.filter((e) => e.id !== eventToDelete.id));
            }
        }

        await removeEventFromQueue(eventToDelete.id);
    } catch (error) {
        console.error('Failed to delete event:', error);
    }
};

/**
 * Handle student confirmation
 */
export const calendarEventHandleConfirmation = async (
    event,
    confirmed,
    userEmail,
    { setAllEvents },
) => {
    const existingResponses = event.studentResponses || [];
    const updatedStudentResponses = existingResponses.filter((r) => r.email !== userEmail);
    updatedStudentResponses.push({ email: userEmail, response: confirmed });

    const updatedEvent = { ...event, studentResponses: updatedStudentResponses };

    try {
        await updateEventInFirestore(event.id, { studentResponses: updatedStudentResponses });
        setAllEvents((prev) => prev.map((evt) => (evt.id === event.id ? updatedEvent : evt)));
    } catch (error) {
        console.error('Failed to update student response:', error);
    }
};

/**
 * Duplicate event
 */
export const calendarEventHandleDuplicate = async (
    event,
    { userRole, userEmail, availabilities, allEvents, setAvailabilities, setAllEvents },
) => {
    const nextDayStart = new Date(event.start);
    nextDayStart.setDate(nextDayStart.getDate() + 1);

    const nextDayEnd = new Date(event.end);
    nextDayEnd.setDate(nextDayEnd.getDate() + 1);

    // Handle tutor availability duplication
    if (event.tutor && userRole === 'tutor' && event.tutor === userEmail) {
        const availabilityData = {
            ...event,
            start: nextDayStart,
            end: nextDayEnd,
        };

        try {
            const docId = await createEventInFirestore(availabilityData, 'tutorAvailabilities');
            availabilityData.id = docId;
            setAvailabilities([...availabilities, { ...availabilityData, id: docId }]);
        } catch (error) {
            console.error('Failed to duplicate availability:', error);
        }
        return;
    }

    // Handle regular event duplication (teachers only)
    if (!event.tutor && userRole === 'teacher') {
        const eventData = {
            ...event,
            start: nextDayStart,
            end: nextDayEnd,
            tutorResponses: [],
            studentResponses: [],
        };

        try {
            const docId = await createEventInFirestore(eventData);
            eventData.id = docId;
            setAllEvents([...allEvents, { ...eventData, id: docId }]);
            await addOrUpdateEventInQueue(eventData, 'store');

            if (eventData.approvalStatus === 'approved') {
                const subject = eventData.title;
                const description = eventData.description || '';
                const startTime = new Date(eventData.start).toISOString();
                const endTime = new Date(eventData.end).toISOString();
                const attendeesEmailArr = [...eventData.students, ...eventData.staff].map(
                    (p) => p.value,
                );

                await createTeamsMeeting(
                    { ...eventData, id: docId },
                    subject,
                    description,
                    startTime,
                    endTime,
                    attendeesEmailArr,
                );
            }
        } catch (error) {
            console.error('Failed to duplicate event:', error);
        }
    }
};
