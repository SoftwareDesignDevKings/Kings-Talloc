'use client';

import React, { useState } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';

import { useCalendarUI } from '@contexts/CalendarUIContext';
import { useCalendarData } from '@/providers/CalendarDataProvider';

import useCalendarStrategy from '@/hooks/useCalendarStrategy';
import useAuthSession from '@/hooks/useAuthSession';
import useAlert from '@/hooks/useAlert';
import { updateEventInFirestore, createEventInFirestore } from '@/firestore/firestoreOperations';
import { calendarEventCreateTeamsMeeting } from '@/utils/calendarEvent';

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

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }),
    getDay,
    locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

const MemoizedCustomEvent = memo(CustomEvent);
const MemoizedCalendarTimeSlot = memo(CustomTimeslot);

/* ───────────────────────────────────────────────────────────── */
/* CalendarContent                                                */
/* ───────────────────────────────────────────────────────────── */

const CalendarContent = () => {
    const { session, userRole, device } = useAuthSession();
    const strategy = useCalendarStrategy(session.user.email, userRole);
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
    } = useCalendarData();

    /* ----------------------------------------------------------- */
    /* Events and Availabilities - Pre-filtered by CalendarUIProvider */
    /* ----------------------------------------------------------- */
    const rbcEvents = filteredEvents;
    const overlayAvailabilities = filteredAvailabilities;

    /* ----------------------------------------------------------- */
    /* Calendar bounds                                             */
    /* ----------------------------------------------------------- */
    const minTime = parse('06:00', 'HH:mm', new Date());
    const maxTime = parse('22:00', 'HH:mm', new Date());

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
     * @param {Object} fieldUpdates - Object with field names as keys (e.g., { title: "Math", staff: [...] })
     */
    const updateCalendarTarget = (fieldUpdates) => {
        setCalendarTarget((prevTarget) => ({
            ...prevTarget,      // Keep all existing fields
            ...fieldUpdates,    // Overwrite with new field values
        }));
    };


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

    const handleDuplicateEvent = async (event) => {
        try {
            // calculate new start/end (next day, same duration)
            const duration = event.end - event.start;
            const newStart = addDays(event.start, 1);
            const newEnd = new Date(newStart.getTime() + duration);

            // copy event data but remove properties that shouldn't be duplicated
            const { id, createdAt, updatedAt, recurringEventId, isRecurringInstance, recurring, until, eventExceptions, entityType, ...eventData } = event;

            // Prepare the duplicated event data
            const duplicatedEvent = {
                ...eventData,
                start: newStart,
                end: newEnd,
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

    const handleEventDrop = async ({ event, start, end }) => {
        if (!strategy.permissions?.canDrag?.(event)) return;

        try {
            // Determine collection based on entity type
            const collectionMap = {
                [CalendarEntityType.SHIFT]: 'shifts',
                [CalendarEntityType.AVAILABILITY]: 'tutorAvailabilities',
                [CalendarEntityType.STUDENT_REQUEST]: 'studentEventRequests',
            };
            const collectionName = collectionMap[event.entityType];

            if (!collectionName) return;

            // Update in Firestore
            await updateEventInFirestore(event.id, { start, end }, collectionName);
        } catch (error) {
            console.error('Failed to update event:', error);
        }
    };

    const handleEventResize = async ({ event, start, end }) => {
        if (!strategy.permissions?.canResize?.(event)) return;

        try {
            // Determine collection based on entity type
            const collectionMap = {
                [CalendarEntityType.SHIFT]: 'shifts',
                [CalendarEntityType.AVAILABILITY]: 'tutorAvailabilities',
                [CalendarEntityType.STUDENT_REQUEST]: 'studentEventRequests',
            };
            const collectionName = collectionMap[event.entityType];

            if (!collectionName) return;

            // Update in Firestore
            await updateEventInFirestore(event.id, { start, end }, collectionName);
        } catch (error) {
            console.error('Failed to resize event:', error);
        }
    };

    /* ----------------------------------------------------------- */
    /* Render helpers                                              */
    /* ----------------------------------------------------------- */
    const renderTimeSlotWrapper = (props) => {
        if (!strategy.visibility.showAvailabilitySlots) {
            return props.children;
        }

        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
        const weekEnd = addDays(weekStart, 7);

        // map RBC's 'value' prop to CustomTimeslot's 'slotStartValue'
        const { value, children, ...rest } = props;

        return (
            <MemoizedCalendarTimeSlot
                {...rest}
                slotStartValue={value}
                slotAvailabilities={overlayAvailabilities}
                slotWeekStart={weekStart}
                slotWeekEnd={weekEnd}
            >
                {children}
            </MemoizedCalendarTimeSlot>
        );
    };

    const renderEvent = (eventProps) => (
        <MemoizedCustomEvent
            event={eventProps.event}
            canDuplicate={strategy.actions.canDuplicateEvent?.(eventProps.event)}
            onDuplicate={handleDuplicateEvent}
        />
    );

    const defaultView = device === 'mobile' ? Views.DAY : Views.WEEK;
    const rbcViews = device === 'mobile' ? [Views.DAY, Views.WEEK] : [Views.DAY, Views.WEEK, Views.MONTH];

    /* ----------------------------------------------------------- */
    /* Render                                                      */
    /* ----------------------------------------------------------- */

    return (
        <div className="d-flex h-100 w-100">
            <div className="flex-grow-1 p-3 calendar-scroll-container position-relative">
                <div className="h-100">
                    <DnDCalendar
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
