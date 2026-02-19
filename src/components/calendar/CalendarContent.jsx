"use client";

import React, { useState, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, endOfWeek, getDay, addDays } from 'date-fns';
import enAU from 'date-fns/locale/en-AU';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';

import { useCalendarUI } from '@contexts/CalendarUIContext';
import { useAppData } from '@/providers/AppDataProvider';

import useCalendarStrategy from '@/hooks/useCalendarStrategy';
import useAuthSession from '@/hooks/useAuthSession';
import useAlert from '@/hooks/useAlert';
import { updateEventInFirestore, createEventInFirestore } from '@/firestore/firestoreOperations';
import { calendarEventCreateTeamsMeeting, calendarEventUpdateTeamsMeeting } from '@/utils/calendarEvent';
import { detachRecurringInstance } from '@/utils/calendarRecurringEvents';

import { CalendarEntityType } from '@/strategy/calendarStrategy';

import CustomTimeslot from './CustomTimeslot.jsx';
import CustomEvent from './CustomEvent.jsx';
import CalendarFilterPanel from './CalendarFilterPanel.jsx';
import CalendarRenderModals from './CalendarRenderModals.jsx';
import CalendarLegend from './CalendarLegend.jsx';

import { calendarUIGetEventStyle, calendarUIMessages } from '@/utils/calendarUI';

const { memo } = React;

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
    const { session, userRole, userRoles, device } = useAuthSession();
    const strategy = useCalendarStrategy(session.user.email, userRole, userRoles);
    const { addAlert } = useAlert();

    // get pre-filtered data from CalendarUIProvider
    const { filteredEvents, filteredAvailabilities } = useCalendarUI();

    // get state setters from CalendarDataProvider
    const {
        calendarShifts,
        setCalendarShifts,
        calendarAvailabilities,
        setCalendarAvailabilities,
        calendarStudentRequests,
        setCalendarStudentRequests,
        setCalendarDateRange,
        tutors,
    } = useAppData();

    /* ----------------------------------------------------------- */
    /* Events and Availabilities - Pre-filtered by CalendarUIProvider */
    /* ----------------------------------------------------------- */
    const rbcEvents = filteredEvents;
    const overlayAvailabilities = filteredAvailabilities;

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
            calendarEnd = range[range.length - 1];
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


    /* ----------------------------------------------------------- */
    /* Handlers                                                    */
    /* ----------------------------------------------------------- */
    const handleSelectEvent = (calEvent) => {
        const action = strategy.actions.getEventFlow(calEvent);
        if (!action) return;

        setCalendarAction(action);
        setCalendarTarget(calEvent);
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

    // handle RBC event drop
    const handleEventDrop = async ({ event, start, end }) => {
        if (!strategy.permissions.canDrag(event)) {
            return;
        }

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
        />
    );

    // render different views depending on device
    const defaultView = device === 'mobile' ? Views.DAY : Views.WEEK;
    const rbcViews = device === 'mobile' ? [Views.DAY, Views.WEEK] : [Views.DAY, Views.WEEK, Views.MONTH];

    return (
        <div className="d-flex h-100 w-100">
            <div className="flex-grow-1 p-3 calendar-scroll-container position-relative">
                <div className="h-100">
                    <DnDCalendar
                        culture="en-AU"
                        localizer={localizer}
                        events={rbcEvents}
                        startAccessor="start"
                        endAccessor="end"
                        min={minTime}
                        max={maxTime}
                        style={{ height: '100%' }}

                        defaultView={defaultView}
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
        
            <div className="position-absolute bottom-0 end-0 mb-3 me-3" style={{ zIndex: 10 }}>
                <CalendarLegend />
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
