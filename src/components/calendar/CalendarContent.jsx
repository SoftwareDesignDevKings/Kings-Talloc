"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays } from 'date-fns';
import enAU from 'date-fns/locale/en-AU';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';

import { useCalendarUI } from '@contexts/CalendarUIContext';
import { useAppData } from '@/contexts/AppDataContext';

import useCalendarStrategy from '@/hooks/useCalendarStrategy';
import useAuthSession from '@/hooks/useAuthSession';
import useAlert from '@/hooks/useAlert';
import { updateEventInFirestore, createEventInFirestore, updateWorkStatusInFirestore } from '@/firestore/firestoreOperations';
import { calendarEventCreateTeamsMeeting, calendarEventUpdateTeamsMeeting } from '@/utils/calendarEvent';
import { detachRecurringInstance } from '@/utils/calendarRecurringEvents';

import { CalendarEntityType } from '@lib/patterns/calendarStrategy';

import CustomTimeslot from './CustomTimeslot.jsx';
import CustomEvent, { getEventParticipantInitials } from './CustomEvent.jsx';
import CalendarFilterPanel from './CalendarFilterPanel.jsx';
import CalendarRenderModals from './CalendarRenderModals.jsx';

import { calendarUIGetEventStyle, calendarUIMessages } from '@/utils/calendarUI';
import { isRangeCoveredByTutorAvailability, getTutorShiftConflicts } from '@/utils/calendarAvailability';

const { memo } = React;

const KEY_WINDOW_MS = 600;
const isFormElement = (el) => {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
};

/* ───────────────────────────────────────────────────────────── */
/* RBC setup                                                     */
/* ───────────────────────────────────────────────────────────── */

const locales = { 'en-AU': enAU };

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }),
    getDay,
    locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

const MemoisedCustomEvent = memo(CustomEvent);
const MemoisedCalendarTimeSlot = memo(CustomTimeslot);

/* ───────────────────────────────────────────────────────────── */
/* CalendarContent                                                */
/* ───────────────────────────────────────────────────────────── */

const CalendarContent = () => {
    const { session, userRole, device } = useAuthSession();
    const strategy = useCalendarStrategy(session.user.email, userRole);
    const { addAlert } = useAlert();

    // get pre-filtered data from CalendarUIContextProvider
    const { filteredEvents, filteredAvailabilities } = useCalendarUI();

    // get state setters from CalendarDataProvider
    const {
        calendarShifts,
        setCalendarShifts,
        calendarAvailabilities,
        setCalendarAvailabilities,
        calendarStudentRequests,
        setCalendarStudentRequests,
        calendarDateRange,
        setCalendarDateRange,
        tutors,
    } = useAppData();

    // track the calendar's displayed date to keep it in sync with the data provider
    const [calendarDate, setCalendarDate] = useState(() => calendarDateRange.start);
    const [calendarView, setCalendarView] = useState(Views.WEEK);

    useEffect(() => {
        if (device === 'mobile') {                                                                           
            setCalendarView(Views.DAY);                                                                        
        }
    }, [device]);

    /* ----------------------------------------------------------- */
    /* Events and Availabilities - Pre-filtered by CalendarUIContextProvider */
    /* ----------------------------------------------------------- */
    // Split availability blocks into RBC's backgroundEvents layer so they don't
    // collide with foreground events at touching boundaries (e.g. availability
    // ending 13:30 next to a shift starting 13:30 was being laid out as overlapping).
    const isInteractiveAvailability = (event) =>
        event.entityType === CalendarEntityType.AVAILABILITY &&
        (
            strategy.actions.canModifyEvent?.(event) ||
            strategy.actions.canDuplicateEvent?.(event)
        );

    const rbcEvents = filteredEvents.filter(
        (e) => e.entityType !== CalendarEntityType.AVAILABILITY || isInteractiveAvailability(e),
    );
    const rbcBackgroundEvents = filteredEvents.filter(
        (e) => e.entityType === CalendarEntityType.AVAILABILITY && !isInteractiveAvailability(e),
    );
    const overlayAvailabilities = filteredAvailabilities;
    const dailyInitialsByDate = useMemo(() => {
        const initialsByDate = new Map();

        rbcEvents.forEach((event) => {
            const start = new Date(event.start);
            if (Number.isNaN(start.getTime())) return;

            const dateKey = format(start, 'yyyy-MM-dd');
            const initials = getEventParticipantInitials(event, tutors).filter(Boolean);
            if (initials.length === 0) return;

            if (!initialsByDate.has(dateKey)) {
                initialsByDate.set(dateKey, new Set());
            }

            initials.forEach((initial) => initialsByDate.get(dateKey).add(initial));
        });

        return Object.fromEntries(
            Array.from(initialsByDate.entries()).map(([dateKey, initials]) => [
                dateKey,
                Array.from(initials).sort().join(', '),
            ]),
        );
    }, [rbcEvents, tutors]);

    /* ----------------------------------------------------------- */
    /* Calendar bounds                                             */
    /* ----------------------------------------------------------- */
    const minTime = parse('04:00', 'HH:mm', new Date());
    const maxTime = parse('22:00', 'HH:mm', new Date());

    /**
     * RBC 'Next', 'Prev', or changes views - sync with setCalendarDateRange to update DataContext useEffect dependency
     * and will make firebase db fetch with the RBC calendar range
    **/
    const handleCalendarRangeChange = (range) => {
        let calendarStart, calendarEnd;

        // RBC returns an array for Week/Day view and an Object for Month view
        if (Array.isArray(range)) {
            calendarStart = range[0];

            // RBC gives midnight of each day — extend to end of the last day so events
            // on Sunday (week view) or the selected day (day view) are included in queries
            calendarEnd = new Date(range[range.length - 1]);
            calendarEnd.setHours(23, 59, 59, 999);
        } else {
            calendarStart = range.start;
            calendarEnd = range.end;
        }

        // Update the global range state to trigger the optimized Firestore listeners
        setCalendarDateRange({
            start: calendarStart,
            end: calendarEnd
        });
    };

    /**
     * Handle calendar navigation (prev/next/today buttons)
     * Update the displayed date and sync with data provider
     */
    const handleNavigate = (newDate) => {
        setCalendarDate(newDate);
    };
    

    /* ----------------------------------------------------------- */
    /* Permissions                                                 */
    /* ----------------------------------------------------------- */
    const canDragEvent = (event) =>
        strategy.permissions?.canDrag?.(event) ?? false;

    const canResizeEvent = (event) =>
        strategy.permissions?.canResize?.(event) ?? false;

    /* ----------------------------------------------------------- */
    /* ACTION + TARGET STATE                                       */
    /* ----------------------------------------------------------- */
    const [calendarAction, setCalendarAction] = useState(null);
    const [calendarTarget, setCalendarTarget] = useState(null);

    const closeCalendarAction = () => {
        setCalendarAction(null);
        setCalendarTarget(null);
    };

    /**
     * Update specific fields in the draft event/target
     * @param {Object|Function} fieldUpdates - object with field names as keys (e.g. { title: "Math", staff: [...] })
     * or a function that receives previous state
     */
    const updateCalendarTarget = useCallback((fieldUpdates) => {
        setCalendarTarget((prevTarget) => {
            let updates;
            if (typeof fieldUpdates === 'function') {
                updates = fieldUpdates(prevTarget)
            } else {
                updates = fieldUpdates
            }
            return {
                ...prevTarget,
                ...updates
            }
        });
    }, []);


    // track the bare 'C' key for the hold-C-to-complete shortcut
    const cKeyTimestampRef = React.useRef(0);

    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (isFormElement(document.activeElement)) return;
            if (!e.metaKey && !e.ctrlKey && e.key.toLowerCase() === 'c') {
                cKeyTimestampRef.current = Date.now();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const isCKeyRecent = () => {
        const ts = cKeyTimestampRef.current;
        if (!ts) return false;
        const recent = Date.now() - ts < KEY_WINDOW_MS;
        if (recent) cKeyTimestampRef.current = 0; // consume
        return recent;
    };

    /* ----------------------------------------------------------- */
    /* Handlers                                                    */
    /* ----------------------------------------------------------- */
    const handleSelectEvent = async (calEvent) => {
        // C + click: quick-toggle workStatus on shifts
        if (isCKeyRecent() && calEvent.entityType === CalendarEntityType.SHIFT) {
            if (!strategy.actions.canCompleteEvent?.(calEvent)) {
                addAlert('warning', 'You do not have permission to change work status');
                return;
            }
            if (calEvent.isRecurringInstance) {
                addAlert('warning', 'Open the event to change work status for a recurring instance');
                return;
            }
            const newStatus = calEvent.workStatus === 'completed' ? 'notCompleted' : 'completed';
            setCalendarShifts(prev =>
                prev.map(e => e.id === calEvent.id ? { ...e, workStatus: newStatus } : e)
            );
            try {
                await updateWorkStatusInFirestore(calEvent.id, newStatus);
                addAlert('success', newStatus === 'completed' ? 'Marked as completed' : 'Marked as not completed');
            } catch (error) {
                setCalendarShifts(prev =>
                    prev.map(e => e.id === calEvent.id ? { ...e, workStatus: calEvent.workStatus } : e)
                );
                addAlert('error', `Failed to update: ${error.message}`);
            }
            return;
        }

        const action = strategy.actions.getEventFlow(calEvent);
        if (!action) return;

        let target = calEvent;
        // Availabilities are rendered split around clashing shifts (calendarAvailabilitySplit),
        // giving fragments a synthetic id and truncated times. Resolve back to the real document
        // so view/edit/delete operate on the underlying availability, not a render artifact.
        if (calEvent.originalAvailabilityId) {
            const original = calendarAvailabilities.find(
                (a) => a.id === calEvent.originalAvailabilityId,
            );
            if (original) {
                const { originalAvailabilityId, ...rest } = calEvent;
                target = { ...rest, id: original.id, start: original.start, end: original.end };
            }
        }

        setCalendarAction(action);
        setCalendarTarget(target);
    };

    const handleSelectSlot = (slotInfo) => {
        const entityType = Object.values(CalendarEntityType).find((type) =>
            strategy.actions.canCreateEvent({ entityType: type }),
        );

        if (!entityType) return;

        const action = strategy.actions.getCreateFlow();
        if (!action) return;

        setCalendarAction(action);
        setCalendarTarget({
            start: slotInfo.start,
            end: slotInfo.end,
        });
    };

    // rbc - handle event duplication
    const handleDuplicateEvent = async (event) => {
        try {
            // calculate new start/end (next day, same duration)
            const duration = event.end - event.start;
            const newStart = addDays(event.start, 1);
            const newEnd = new Date(newStart.getTime() + duration);

            // A student must not be able to bypass the availability check by
            // creating a request in a free slot and duplicating it onto a day
            // where the assigned tutor is no longer available.
            if (blockIfTutorUnavailable(event, newStart, newEnd, 'duplicate')) return;
            if (blockIfTutorConflict(event, newStart, newEnd)) return;

            // copy event data but remove properties that shouldn't be duplicated and create duplication event dictionary
            const { id, createdAt, updatedAt, recurringEventId, isRecurringInstance, recurring, until, eventExceptions, entityType, ...eventData } = event;
            const duplicatedEvent = {
                ...eventData,
                start: newStart,
                end: newEnd,
                recurring: null,  // Explicitly set to null (not missing) so it matches the non-recurring query
                until: null,
                isRecurringInstance: false,
                recurringEventId: null,
            };

            // determine collection name based on entity type
            let collectionName;
            let stateArray;
            let stateSetter;
            if (entityType === CalendarEntityType.SHIFT) {
                collectionName = 'shifts';
                stateArray = calendarShifts;
                stateSetter = setCalendarShifts;
            } else if (entityType === CalendarEntityType.AVAILABILITY) {
                collectionName = 'tutorAvailabilities';
                stateArray = calendarAvailabilities;
                stateSetter = setCalendarAvailabilities;
            } else if (entityType === CalendarEntityType.STUDENT_REQUEST) {
                collectionName = 'studentEventRequests';
                stateArray = calendarStudentRequests;
                stateSetter = setCalendarStudentRequests;
            } else {
                addAlert('error', 'Cannot duplicate this event type');
                return;
            }

            // save to Firestore and update a new RBC event
            const docId = await createEventInFirestore(duplicatedEvent, collectionName);
            const newEvent = {
                ...duplicatedEvent,
                id: docId,
                entityType: entityType,
            };
            stateSetter([...stateArray, newEvent]);

            // Create Teams meeting only if the original event had createTeamsMeeting enabled
            if (duplicatedEvent.createTeamsMeeting && entityType !== CalendarEntityType.AVAILABILITY &&
                (duplicatedEvent.staff?.length > 0 || duplicatedEvent.students?.length > 0)) {
                calendarEventCreateTeamsMeeting(docId, duplicatedEvent, { addAlert }).catch((error) => {
                    console.error('Teams meeting creation failed:', error);
                    addAlert('error', `Event duplicated but Teams meeting failed: ${error.message}`);
                });
            }

            addAlert('success', 'Event duplicated to next day');
        } catch (error) {
            console.error('Error duplicating event:', error);
            addAlert('error', `Failed to duplicate event: ${error.message}`);
        }
    };

    // helper to map entity type to firebase collection name and state setter
    const getCalendarEntityHandlers = (entityType) => {
        const collectionMap = {
            [CalendarEntityType.SHIFT]: 'shifts',
            [CalendarEntityType.AVAILABILITY]: 'tutorAvailabilities',
            [CalendarEntityType.STUDENT_REQUEST]: 'studentEventRequests',
        };
        const stateSetterMap = {
            [CalendarEntityType.SHIFT]: setCalendarShifts,
            [CalendarEntityType.AVAILABILITY]: setCalendarAvailabilities,
            [CalendarEntityType.STUDENT_REQUEST]: setCalendarStudentRequests,
        };
        return {
            collectionName: collectionMap[entityType],
            setStateFn: stateSetterMap[entityType],
        };
    };

    // handle drag/drop or resize for recurring instances
    const handleRecurringInstanceUpdate = async (event, start, end, actionLabel) => {
        const { setStateFn } = getCalendarEntityHandlers(event.entityType);

        if (!setStateFn) return;

        try {
            // Detach from series and create standalone event with new times
            await detachRecurringInstance(event, { start, end });

            // Remove the recurring instance from state (Firestore listener will add the new standalone event)
            setStateFn(prev => prev.filter(e => e.id !== event.id));

            addAlert('success', `Event detached and ${actionLabel}d successfully`);

        } catch (error) {
            addAlert('error', `Failed to ${actionLabel} recurring event: ${error.message}`);
            console.error(`Failed to ${actionLabel} recurring event:`, error);
        }
    };

    // shared handler for event updates with instant UI state update and rollback
    const updateEventWithRollback = async (event, start, end, actionLabel) => {
        const originalStart = event.start;
        const originalEnd = event.end;
        const { collectionName, setStateFn } = getCalendarEntityHandlers(event.entityType);

        if (!collectionName || !setStateFn) return;

        try {
            // UI STATE UPDATE - immediate UI feedback
            setStateFn(prev => prev.map(existingEvent =>
                existingEvent.id === event.id ? { ...existingEvent, start, end } : existingEvent
            ));

            // FIRESTORE UPDATE
            await updateEventInFirestore(event.id, { start, end }, collectionName);

            // TEAMS MEETING UPDATE - if event is a shift with Teams meeting enabled
            if (event.entityType === CalendarEntityType.SHIFT && event.createTeamsMeeting === true && event.teamsEventId) {
                const isAvailability = event.entityType === CalendarEntityType.AVAILABILITY;
                const isStudentRequest = event.entityType === CalendarEntityType.STUDENT_REQUEST;

                await calendarEventUpdateTeamsMeeting(event, start, end, isAvailability, isStudentRequest, { addAlert });
            }

        } catch (error) {
            // ROLLBACK on failure - restore original position
            setStateFn(prev => prev.map(existingEvent =>
                existingEvent.id === event.id ? { ...existingEvent, start: originalStart, end: originalEnd } : existingEvent
            ));

            addAlert('error', `Failed to ${actionLabel} event: ${error.message}`);
            console.error(`Failed to ${actionLabel} event:`, error);
        }
    };

    // For a pending student request, the new slot must still sit inside the
    // assigned tutor's remaining availability. Returns true if blocked.
    // Only students are gated — teachers/admins can move requests anywhere.
    const blockIfTutorUnavailable = (event, start, end, action = 'move') => {
        if (userRole !== 'student') return false;
        const isPendingStudentRequest =
            event.entityType === CalendarEntityType.STUDENT_REQUEST &&
            event.createdByStudent === true &&
            event.approvalStatus === 'pending';
        if (!isPendingStudentRequest) return false;

        const tutorEmail = event.staff?.[0]?.value || event.staff?.[0];
        if (!tutorEmail) return false;

        const covered = isRangeCoveredByTutorAvailability(
            tutorEmail,
            start,
            end,
            overlayAvailabilities,
        );
        if (!covered) {
            const message =
                action === 'duplicate'
                    ? 'Cannot duplicate this request — the tutor is not available at the same time on the next day.'
                    : 'Tutor is not available during the selected time.';
            addAlert('warning', message);
            return true;
        }
        return false;
    };

    // A shift must not be dragged/resized/duplicated onto another of the
    // assigned tutor's events. Returns true if blocked (caller early-returns,
    // so the calendar simply snaps the event back — no Firestore write occurs).
    const blockIfTutorConflict = (event, start, end) => {
        if (event.entityType !== CalendarEntityType.SHIFT) return false;
        if (!event.staff?.length) return false;

        const conflicts = getTutorShiftConflicts(
            event.staff,
            start,
            end,
            calendarShifts,
            event.recurringEventId || event.id,
        );
        if (conflicts.length > 0) {
            addAlert('warning', 'Tutor already has an event at this time.');
            return true;
        }
        return false;
    };

    // handle RBC event drop
    const handleEventDrop = async ({ event, start, end }) => {
        if (!strategy.permissions.canDrag(event)) {
            return;
        }

        if (blockIfTutorUnavailable(event, start, end)) return;
        if (blockIfTutorConflict(event, start, end)) return;

        // Check if this is a recurring instance - if so, detach it
        if (event.isRecurringInstance) {
            await handleRecurringInstanceUpdate(event, start, end, 'move');
        } else {
            await updateEventWithRollback(event, start, end, 'move');
        }
    };

    // handle RBC event resize
    const handleEventResize = async ({ event, start, end }) => {
        if (!strategy.permissions.canResize(event)) {
            return;
        }

        if (blockIfTutorUnavailable(event, start, end)) return;
        if (blockIfTutorConflict(event, start, end)) return;

        // Check if this is a recurring instance - if so, detach it
        if (event.isRecurringInstance) {
            await handleRecurringInstanceUpdate(event, start, end, 'resize');
        } else {
            await updateEventWithRollback(event, start, end, 'resize');
        }
    };

    // render RBC time-slots
    const renderTimeSlotWrapper = (props) => {
        if (!strategy.visibility.showAvailabilitySlots) {
            return props.children;
        }

        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const weekEnd = addDays(weekStart, 7);

        // map RBC's 'value' prop to CustomTimeslot's 'slotStartValue'
        const { value, children, ...rest } = props;

        return (
            <MemoisedCalendarTimeSlot
                {...rest}
                slotStartValue={value}
                slotAvailabilities={overlayAvailabilities}
                slotTutors={tutors}
                slotWeekStart={weekStart}
                slotWeekEnd={weekEnd}
            >
                {children}
            </MemoisedCalendarTimeSlot>
        );
    };

    // render RBC custom event
    const renderEvent = (eventProps) => (
        <MemoisedCustomEvent
            event={eventProps.event}
            canDuplicate={strategy.actions.canDuplicateEvent?.(eventProps.event)}
            onDuplicate={handleDuplicateEvent}
            tutors={tutors}
            dayInitials={dailyInitialsByDate[format(new Date(eventProps.event.start), 'yyyy-MM-dd')] || ''}
        />
    );

    const rbcViews = device === 'mobile' ? [Views.DAY, Views.WEEK] : [Views.DAY, Views.WEEK, Views.MONTH];

    return (
        <div className="d-flex h-100 w-100">
            <div className="grow p-3 calendar-scroll-container position-relative">
                <div className="h-100">
                    <DnDCalendar
                        culture="en-AU"
                        localizer={localizer}
                        events={rbcEvents}
                        backgroundEvents={rbcBackgroundEvents}
                        startAccessor="start"
                        endAccessor="end"
                        min={minTime}
                        max={maxTime}
                        style={{ height: '100%' }}

                        date={calendarDate}
                        onNavigate={handleNavigate}
                        view={calendarView}
                        onView={setCalendarView}
                        views={rbcViews}

                        draggableAccessor={canDragEvent}
                        resizableAccessor={canResizeEvent}
                        onEventDrop={handleEventDrop}
                        onEventResize={handleEventResize}

                        onRangeChange={handleCalendarRangeChange}

                        selectable
                        popup
                        messages={calendarUIMessages}
                        eventPropGetter={calendarUIGetEventStyle}

                        onSelectEvent={handleSelectEvent}
                        onSelectSlot={handleSelectSlot}

                        components={{
                            event: renderEvent,
                            timeSlotWrapper: renderTimeSlotWrapper,
                            header: ({ label }) => <span style={{ fontWeight: 'bold' }}>{label}</span>
                        }}
                    />
                </div>
            </div>
        
            <CalendarFilterPanel calendarStrategy={strategy} device={device} userRole={userRole} />
            
            {/* render different modals depending on the target, action  */}
            <CalendarRenderModals
                calendarAction={calendarAction}
                calendarTarget={calendarTarget}
                onClose={closeCalendarAction}
                updateCalendarTarget={updateCalendarTarget} 
                studentEmail={session.email}
            />
        </div>
    );
};

export default CalendarContent;
