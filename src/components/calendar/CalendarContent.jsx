'use client';

import React, { useState, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';

import { useCalendarData } from '@/providers/CalendarDataProvider';
import useCalendarStrategy from '@/hooks/useCalendarStrategy';
import useAuthSession from '@/hooks/useAuthSession';

import {
    CalendarEntityType,
    CalendarFlow,
} from '@/strategy/calendarStrategy';

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
    const strategy = useCalendarStrategy(session.email, userRole);

    const {
        calendarShifts,
        setCalendarShifts,
        calendarAvailabilities,
        setCalendarAvailabilities,
        calendarStudentRequests,
        setCalendarStudentRequests,
    } = useCalendarData();

    /* ----------------------------------------------------------- */
    /* Merge all calendar entities                                 */
    /* ----------------------------------------------------------- */
    const calendarEntities = useMemo(
        () => [
            ...calendarShifts,
            ...calendarAvailabilities,
            ...calendarStudentRequests,
        ],
        [calendarShifts, calendarAvailabilities, calendarStudentRequests],
    );

    /* ----------------------------------------------------------- */
    /* Event layer (RBC events)                                    */
    /* ----------------------------------------------------------- */
    const rbcEvents = useMemo(
        () =>
            calendarEntities.filter((calEvent) =>
                strategy.visibility.includeInCalendar(calEvent),
            ),
        [calendarEntities, strategy],
    );

    /* ----------------------------------------------------------- */
    /* Availability overlay layer                                  */
    /* ----------------------------------------------------------- */
    const overlayAvailabilities = useMemo(() => {
        if (!strategy.visibility.showAvailabilitySlots) return [];

        // Tutors: only OTHER tutors' availability
        if (userRole === 'tutor') {
            return calendarAvailabilities.filter(
                (a) => a.tutor !== session.email,
            );
        }

        // Teachers + students: all availability
        return calendarAvailabilities;
    }, [strategy, userRole, calendarAvailabilities, session.email]);

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

    // redefine them her 
    const eventsData = {
        allEvents: calendarShifts,
        setAllEvents: setCalendarShifts,
        availabilities: calendarAvailabilities,
        setAvailabilities: setCalendarAvailabilities,
        studentRequests: calendarStudentRequests,
        setStudentRequests: setCalendarStudentRequests,
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

        // Create draft with all required fields initialized
        const draftCalEvent = {
            entityType,
            start: slotInfo.start,
            end: slotInfo.end,
            title: '',
            description: '',
            staff: [],
            classes: [],
            students: [],
            tutorResponses: [],
            studentResponses: [],
            minStudents: 0,
            createdByStudent: false,
            approvalStatus: 'pending',
            workStatus: 'notCompleted',
            workType: 'tutoring',
            locationType: '',
            subject: null,
            preference: null,
            recurring: null,
            createTeamsMeeting: false,
            confirmationRequired: false,
        };

        const action = strategy.actions.getCreateFlow(draftCalEvent);
        if (!action) return;

        setCalendarAction(action);
        setCalendarTarget(draftCalEvent);
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

        return (
            <MemoizedCalendarTimeSlot
                {...props}
                slotAvailabilities={overlayAvailabilities}
                slotWeekStart={weekStart}
                slotWeekEnd={weekEnd}
            />
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

                    selectable
                    popup
                    messages={calendarUIMessages}
                    eventPropGetter={calendarUIGetEventStyle}

                    onSelectEvent={handleSelectEvent}
                    onSelectSlot={handleSelectSlot}

                    components={{
                        event: renderEvent,
                        timeSlotWrapper: renderTimeSlotWrapper,
                    }}
                />
            </div>

            <CalendarFilterPanel calendarStrategy={strategy} />
            
            {/* render different modals depending on the target, action  */}
            <CalendarRenderModals
                action={calendarAction}
                target={calendarTarget}
                onClose={closeCalendarAction}
                updateTarget={updateCalendarTarget}
                eventsData={eventsData}
                studentEmail={session.email}
            />
        </div>
    );
};

export default CalendarContent;
