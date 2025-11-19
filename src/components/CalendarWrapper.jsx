'use client';

import React, { useState, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import { calendarUIGetEventStyle, calendarUIMessages } from '@/utils/calendarUI';
import CalendarFilterPanel from './calendar/CalendarFilterPanel.jsx';
import CalendarTimeSlotWrapper from './calendar/CalendarTimeSlotWrapper.jsx';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';

// Load calendar CSS only when calendar is rendered
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

// Providers
import { CalendarDataProvider, useCalendarData } from '@/providers/CalendarDataProvider';
import { CalendarUIProvider, useCalendarUI } from '@/providers/CalendarUIProvider';

// Form and modal components
import EventForm from './forms/EventForm.jsx';
import TutorAvailabilityForm from './forms/TutorAvailabilityForm.jsx';
import StudentEventForm from './forms/StudentEventForm.jsx';
import EventDetailsModal from './modals/EventDetailsModal.jsx';
import RecurringUpdateModal from './modals/RecurringUpdateModal.jsx';
import CustomEvent from './calendar/CustomEvent.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';

// Utils
import {
    calendarEventGetDefaults,
    calendarEventHandleDrop,
    calendarEventHandleResize,
    calendarEventHandleDelete,
    calendarEventHandleConfirmation,
    calendarEventHandleDuplicate,
} from '@/utils/calendarEvent';
import useAlert from '@/hooks/useAlert';

const { memo } = React;

const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }),
    getDay,
    locales,
});
const DnDCalendar = withDragAndDrop(Calendar);

// Memoized components for better performance
const MemoizedCustomEvent = memo(CustomEvent);
const MemoizedCalendarTimeSlotWrapper = memo(CalendarTimeSlotWrapper);
const MemoizedCalendarFilterPanel = memo(CalendarFilterPanel);

// Calendar content component
const CalendarContent = () => {
    const calendarStartTime = '06:00';
    const calendarEndTime = '22:00';

    // Get data and UI from contexts
    const dataContext = useCalendarData();
    const uiContext = useCalendarUI();
    const { setAlertMessage, setAlertType } = useAlert();

    const {
        allEvents,
        setAllEvents,
        availabilities,
        setAvailabilities,
        studentRequests,
        setStudentRequests,
        splitAvailabilitiesData,
        subjects,
        tutors,
        students,
        loading,
        userRole,
        userEmail,
    } = dataContext;

    const {
        showEvents,
        showInitials,
        isFilterPanelOpen,
        filters,
        filteredEvents,
        filteredAvailabilities,
    } = uiContext;

    // Detect mobile on mount
    const [isMobile, setIsMobile] = useState(false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Calendar navigation state
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState(Views.WEEK);

    // Update view when isMobile changes
    React.useEffect(() => {
        if (isMobile) {
            setCurrentView(Views.DAY);
        }
    }, [isMobile]);

    // ==================== FORM STATE (LOCAL TO THIS COMPONENT) ====================
    const [showTeacherForm, setShowTeacherForm] = useState(false);
    const [showStudentForm, setShowStudentForm] = useState(false);
    const [showAvailabilityForm, setShowAvailabilityForm] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [eventToEdit, setEventToEdit] = useState(null);
    const [newEvent, setNewEvent] = useState({});
    const [newAvailability, setNewAvailability] = useState({});

    // Recurring modal state
    const [showRecurringUpdateModal, setShowRecurringUpdateModal] = useState(false);
    const [pendingUpdate, setPendingUpdate] = useState(null);

    // ==================== FORM HELPERS ====================
    const closeAllForms = () => {
        setShowTeacherForm(false);
        setShowStudentForm(false);
        setShowAvailabilityForm(false);
        setShowDetailsModal(false);
        setIsEditing(false);
        setEventToEdit(null);
    };

    // ==================== SLOT/EVENT SELECTION ====================
    const handleSelectSlot = (slotInfo) => {
        const defaultData = calendarEventGetDefaults(slotInfo, userRole, userEmail);

        if (userRole === 'student') {
            setNewEvent(defaultData);
            setIsEditing(false);
            setShowStudentForm(true);
        } else if (userRole === 'tutor') {
            setNewAvailability(defaultData);
            setIsEditing(false);
            setShowAvailabilityForm(true);
        } else {
            setNewEvent(defaultData);
            setIsEditing(false);
            setShowTeacherForm(true);
        }
    };

    const handleSelectEvent = (event) => {
        // Tutor clicked on an availability
        if (event.tutor) {
            if (userRole === 'tutor' && event.tutor === userEmail) {
                setNewAvailability(event);
                setIsEditing(true);
                setEventToEdit(event);
                setShowAvailabilityForm(true);
            } else {
                setEventToEdit(event);
                setShowDetailsModal(true);
            }
            return;
        }

        // Teachers can edit all events
        if (userRole === 'teacher') {
            setNewEvent(event);
            setIsEditing(true);
            setEventToEdit(event);
            setShowTeacherForm(true);
            return;
        }

        // Students can only edit their own pending requests
        if (userRole === 'student' && event.isStudentRequest) {
            const isOwnRequest = event.students?.some(
                (s) => s.value === userEmail || s === userEmail,
            );
            if (isOwnRequest) {
                setNewEvent(event);
                setIsEditing(true);
                setEventToEdit(event);
                setShowStudentForm(true);
                return;
            }
        }

        // Default: show details modal
        setEventToEdit(event);
        setShowDetailsModal(true);
    };

    // ==================== EVENT OPERATIONS ====================
    const handleDropWrapper = (dropInfo) => {
        const { event } = dropInfo;
        if (event.isRecurringInstance) {
            setPendingUpdate({ type: 'drop', data: dropInfo });
            setShowRecurringUpdateModal(true);
        } else {
            calendarEventHandleDrop(dropInfo, 'this', {
                userRole,
                userEmail,
                allEvents,
                availabilities,
                studentRequests,
                setAllEvents,
                setAvailabilities,
                setStudentRequests,
                setAlertType,
                setAlertMessage,
            });
        }
    };

    const handleResizeWrapper = (resizeInfo) => {
        const { event } = resizeInfo;
        if (event.isRecurringInstance) {
            setPendingUpdate({ type: 'resize', data: resizeInfo });
            setShowRecurringUpdateModal(true);
        } else {
            calendarEventHandleResize(resizeInfo, 'this', {
                userRole,
                userEmail,
                allEvents,
                availabilities,
                studentRequests,
                setAllEvents,
                setAvailabilities,
                setStudentRequests,
                setAlertType,
                setAlertMessage,
            });
        }
    };

    const handleRecurringUpdateConfirm = (updateOption) => {
        if (pendingUpdate) {
            if (pendingUpdate.type === 'drop') {
                calendarEventHandleDrop(pendingUpdate.data, updateOption, {
                    userRole,
                    userEmail,
                    allEvents,
                    availabilities,
                    studentRequests,
                    setAllEvents,
                    setAvailabilities,
                    setStudentRequests,
                    setAlertType,
                    setAlertMessage,
                });
            } else if (pendingUpdate.type === 'resize') {
                calendarEventHandleResize(pendingUpdate.data, updateOption, {
                    userRole,
                    userEmail,
                    allEvents,
                    availabilities,
                    studentRequests,
                    setAllEvents,
                    setAvailabilities,
                    setStudentRequests,
                    setAlertType,
                    setAlertMessage,
                });
            }
        }
        setShowRecurringUpdateModal(false);
        setPendingUpdate(null);
    };

    const handleDeleteWrapper = async (deleteOption = 'this') => {
        await calendarEventHandleDelete(eventToEdit, deleteOption, {
            setAllEvents,
            setAvailabilities,
            setStudentRequests,
            setAlertType,
            setAlertMessage,
        });
        closeAllForms();
    };

    const handleConfirmationWrapper = (event, confirmed) => {
        calendarEventHandleConfirmation(event, confirmed, userEmail, { setAllEvents });
    };

    const handleDuplicateWrapper = (event) => {
        calendarEventHandleDuplicate(event, {
            userRole,
            userEmail,
            availabilities,
            allEvents,
            setAvailabilities,
            setAllEvents,
        });
    };

    // ==================== COMPUTED VALUES ====================
    const finalEvents = useMemo(() => {
        if (!showEvents) return [];

        const baseEvents = filteredEvents;

        if (userRole === 'tutor') {
            if (filters.visibility.hideOwnAvailabilities) {
                return baseEvents;
            }
            const tutorAvailabilities = splitAvailabilitiesData.filter(
                (avail) => avail.tutor === userEmail,
            );
            return [...baseEvents, ...tutorAvailabilities];
        }

        if (userRole === 'student') {
            return [...baseEvents, ...studentRequests];
        }

        // Teachers
        if (filters.visibility.hideDeniedStudentEvents) {
            const approvedRequests = studentRequests.filter(
                (request) => request.approvalStatus !== 'denied',
            );
            return [...baseEvents, ...approvedRequests];
        }
        return [...baseEvents, ...studentRequests];
    }, [
        showEvents,
        userRole,
        userEmail,
        filteredEvents,
        splitAvailabilitiesData,
        studentRequests,
        filters.visibility.hideOwnAvailabilities,
        filters.visibility.hideDeniedStudentEvents,
    ]);

    const minTime = parse(calendarStartTime, 'HH:mm', new Date());
    const maxTime = parse(calendarEndTime, 'HH:mm', new Date());

    const uniqueTutors = tutors.map((tutor) => ({
        value: tutor.email,
        label: tutor.name || tutor.email,
    }));

    const filteredTutors =
        filters.subject?.tutors?.map((tutor) => ({
            value: tutor.email,
            label: tutor.name || tutor.email,
        })) || [];

    const currentWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekEnd.getDate() + 7);

    const calendarContainerStyle = {
        backgroundColor: '#ffffff',
        color: '#000000',
    };

    const calendarPanelStyle = {
        paddingRight: '3rem',
        backgroundColor: '#ffffff',
        color: '#000000',
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="tw-flex tw-h-full" style={calendarContainerStyle}>
            <div
                className="tw-flex-1 tw-p-5 tw-overflow-hidden tw-relative"
                style={calendarPanelStyle}
            >
                {isMobile ? (
                    <Calendar
                        localizer={localizer}
                        events={finalEvents}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '600px' }}
                        min={minTime}
                        max={maxTime}
                        onSelectSlot={handleSelectSlot}
                        onSelectEvent={handleSelectEvent}
                        selectable
                        popup
                        date={currentDate}
                        onNavigate={setCurrentDate}
                        view={Views.DAY}
                        onView={setCurrentView}
                        views={[Views.DAY]}
                        messages={calendarUIMessages}
                        eventPropGetter={(event) =>
                            calendarUIGetEventStyle(event, userRole, userEmail)
                        }
                        step={30}
                        timeslots={2}
                        longPressThreshold={10}
                        components={{
                            event: (props) => (
                                <MemoizedCustomEvent {...props} showInitials={showInitials} />
                            ),
                        }}
                    />
                ) : (
                    <DnDCalendar
                        localizer={localizer}
                        events={finalEvents}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '600px' }}
                        min={minTime}
                        max={maxTime}
                        onSelectSlot={handleSelectSlot}
                        onSelectEvent={handleSelectEvent}
                        onEventDrop={handleDropWrapper}
                        onEventResize={handleResizeWrapper}
                        resizable
                        selectable
                        longPressThreshold={500}
                        date={currentDate}
                        onNavigate={setCurrentDate}
                        view={currentView}
                        onView={setCurrentView}
                        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                        messages={calendarUIMessages}
                        eventPropGetter={(event) =>
                            calendarUIGetEventStyle(event, userRole, userEmail)
                        }
                        components={{
                            event: (props) => (
                                <MemoizedCustomEvent
                                    {...props}
                                    userRole={userRole}
                                    userEmail={userEmail}
                                    currentView={currentView}
                                    onDuplicate={handleDuplicateWrapper}
                                />
                            ),
                            timeSlotWrapper: (props) => (
                                <MemoizedCalendarTimeSlotWrapper
                                    {...props}
                                    applicableAvailabilities={
                                        showInitials ? filteredAvailabilities : []
                                    }
                                    selectedTutors={filters.tutors}
                                    currentWeekStart={currentWeekStart}
                                    currentWeekEnd={currentWeekEnd}
                                />
                            ),
                        }}
                    />
                )}
            </div>

            <MemoizedCalendarFilterPanel
                uiState={{
                    showEvents,
                    showInitials,
                    isFilterPanelOpen,
                    setShowEvents: uiContext.setShowEvents,
                    setShowInitials: uiContext.setShowInitials,
                    setIsFilterPanelOpen: uiContext.setIsFilterPanelOpen,
                }}
                userRole={userRole}
                eventsData={{
                    allEvents,
                    availabilities,
                    splitAvailabilitiesData,
                    subjects,
                    tutors,
                    students,
                }}
                filterState={{
                    filters,
                    filterActions: {
                        setSelectedSubject: uiContext.setSelectedSubject,
                        setSelectedTutors: uiContext.setSelectedTutors,
                        setSelectedWorkType: uiContext.setSelectedWorkType,
                        setSelectedAvailabilityWorkType: uiContext.setSelectedAvailabilityWorkType,
                        handleTutorFilterChange: uiContext.setSelectedTutors,
                        setHideOwnAvailabilities: uiContext.setHideOwnAvailabilities,
                        setHideDeniedStudentEvents: uiContext.setHideDeniedStudentEvents,
                        setHideTutoringAvailabilites: uiContext.setHideTutoringAvailabilites,
                        setHideWorkAvailabilities: uiContext.setHideWorkAvailabilities,
                        setShowTutoringEvents: uiContext.setShowTutoringEvents,
                        setShowCoachingEvents: uiContext.setShowCoachingEvents,
                    },
                }}
                filteredTutors={filteredTutors}
                uniqueTutors={uniqueTutors}
            />

            {/* Forms */}
            {showTeacherForm && userRole === 'teacher' && (
                <EventForm
                    isEditing={isEditing}
                    newEvent={newEvent}
                    setNewEvent={setNewEvent}
                    eventToEdit={eventToEdit}
                    setShowModal={setShowTeacherForm}
                    eventsData={{
                        allEvents,
                        setAllEvents,
                        availabilities,
                        setAvailabilities,
                        studentRequests,
                        setStudentRequests,
                        subjects,
                        tutors,
                        students,
                    }}
                />
            )}
            {showStudentForm && userRole === 'student' && (
                <StudentEventForm
                    isEditing={isEditing}
                    newEvent={newEvent}
                    setNewEvent={setNewEvent}
                    eventToEdit={eventToEdit}
                    setShowStudentModal={setShowStudentForm}
                    studentEmail={userEmail}
                    eventsData={{
                        allEvents,
                        setAllEvents,
                        availabilities,
                        setAvailabilities,
                        studentRequests,
                        setStudentRequests,
                        subjects,
                        tutors,
                        students,
                    }}
                />
            )}
            {showAvailabilityForm && userRole === 'tutor' && (
                <TutorAvailabilityForm
                    isEditing={isEditing}
                    newAvailability={newAvailability}
                    setNewAvailability={setNewAvailability}
                    eventToEdit={eventToEdit}
                    setShowModal={setShowAvailabilityForm}
                    eventsData={{
                        allEvents,
                        setAllEvents,
                        availabilities,
                        setAvailabilities,
                        studentRequests,
                        setStudentRequests,
                        subjects,
                        tutors,
                        students,
                    }}
                />
            )}
            {showDetailsModal && eventToEdit && (
                <EventDetailsModal
                    key={eventToEdit.id}
                    event={eventToEdit}
                    onClose={() => setShowDetailsModal(false)}
                    calendarEventHandleConfirmation={handleConfirmationWrapper}
                    userEmail={userEmail}
                    userRole={userRole}
                    events={allEvents}
                    setEvents={setAllEvents}
                />
            )}

            {/* Recurring Update Modal */}
            <RecurringUpdateModal
                show={showRecurringUpdateModal}
                onHide={() => {
                    setShowRecurringUpdateModal(false);
                    setPendingUpdate(null);
                }}
                onConfirm={handleRecurringUpdateConfirm}
            />
        </div>
    );
};

/**
 * CalendarWrapper with nested providers
 */
const CalendarWrapper = ({ userRole, userEmail }) => {
    return (
        <CalendarDataProvider userRole={userRole} userEmail={userEmail}>
            <CalendarUIProvider>
                <CalendarContent />
            </CalendarUIProvider>
        </CalendarDataProvider>
    );
};

export default CalendarWrapper;
