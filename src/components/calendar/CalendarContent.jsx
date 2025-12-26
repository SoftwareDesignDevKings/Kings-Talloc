'use client';

import React, { useState } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';

import { useCalendarUI } from '@contexts/CalendarUIContext';

import useCalendarStrategy from '@/hooks/useCalendarStrategy';
import useAuthSession from '@/hooks/useAuthSession';
import { updateEventInFirestore } from '@/firestore/firestoreOperations';

import { CalendarEntityType } from '@/strategy/calendarStrategy';

import CustomTimeslot from './CustomTimeslot.jsx';
import CustomEvent from './CustomEvent.jsx';
import CalendarFilterPanel from './CalendarFilterPanel.jsx';
import CalendarRenderModals from './CalendarRenderModals.jsx';

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

    // get pre-filtered data from CalendarUIProvider
    const { filteredEvents, filteredAvailabilities } = useCalendarUI();;

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

        // TODO: pass the action down into ModalRender.jsx and then call useModalStrat

        const action = strategy.actions.getCreateFlow();
        if (!action) return;

        setCalendarAction(action);
        setCalendarTarget({
            start: slotInfo.start,
            end: slotInfo.end,
        });
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
            canDuplicate={strategy.actions.canDuplicateEvent?.(
                eventProps.event,
            )}
        />
    );

    const defaultView = device === 'mobile' ? Views.DAY : Views.WEEK;
    const rbcViews = device === 'mobile' ? [Views.DAY, Views.WEEK] : [Views.DAY, Views.WEEK, Views.MONTH];

    /* ----------------------------------------------------------- */
    /* Render                                                      */
    /* ----------------------------------------------------------- */

    return (
        <div className="d-flex h-100 w-100">
            <div className="flex-grow-1 p-3 calendar-scroll-container">
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
