"use client";

import React, { useState, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import { eventStyleGetter, messages } from './calendar/helpers';
import CalendarFilterPanel from './calendar/CalendarFilterPanel.jsx';
import CalendarTimeSlotWrapper from './calendar/CalendarTimeSlotWrapper.jsx';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';

// Load calendar CSS only when calendar is rendered
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

// Context and Provider
import { CalendarProvider } from '@/providers/CalendarProvider';
import { useCalendarContext } from '@contexts/CalendarContext.jsx';

// Specialized hooks
import { useCalendarInteractions } from '@/hooks/calendar/useCalendarInteractions';
import { useEventOperations } from '@/hooks/calendar/useEventOperations';
import { useTutorAvailabilityForm } from '@/hooks/forms/useTutorAvailabilityForm';
import { useStudentEventForm } from '@/hooks/forms/useStudentEventForm';
import { useEmailQueueMonitor } from '@/hooks/useEmailQueueMonitor';

// Form and modal components
import EventForm from './forms/EventForm.jsx';
import TutorAvailabilityForm from './forms/TutorAvailabilityForm.jsx';
import StudentEventForm from './forms/StudentEventForm.jsx';
import EventDetailsModal from './modals/EventDetailsModal.jsx';
import RecurringUpdateModal from './modals/RecurringUpdateModal.jsx';
import CustomEvent from './calendar/CustomEvent.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';

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

// Calendar content component that uses context
const CalendarContent = () => {
  const calendarStartTime = "06:00";
  const calendarEndTime = "22:00";

  // Detect mobile on mount
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calendar navigation state - default to DAY view on mobile
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState(Views.WEEK);

  // Update view when isMobile changes - force DAY view on mobile
  React.useEffect(() => {
    if (isMobile) {
      setCurrentView(Views.DAY);
    }
  }, [isMobile]);

  // Get context data
  const {
    eventsData,
    uiState,
    filterState,
    forms,
    getFilteredEvents,
    getFilteredAvailabilities,
    userRole,
    userEmail
  } = useCalendarContext();

  // Use specialized hooks for specific responsibilities
  const calendarInteractions = useCalendarInteractions(userRole, userEmail, forms, eventsData);
  const eventOperations = useEventOperations(eventsData, userRole, userEmail);

  // Monitor email queue and send emails every 5 minutes if there are changes (teacher only)
  useEmailQueueMonitor(userRole);
  const tutorAvailabilityForm = useTutorAvailabilityForm(eventsData);
  const studentEventForm = useStudentEventForm(eventsData);

  // Recurring update modal state
  const [showRecurringUpdateModal, setShowRecurringUpdateModal] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(null);

  // Wrapper for handleEventDrop to show modal for recurring events
  const handleEventDropWrapper = (dropInfo) => {
    const { event } = dropInfo;
    if (event.isRecurringInstance) {
      setPendingUpdate({ type: 'drop', data: dropInfo });
      setShowRecurringUpdateModal(true);
    } else {
      eventOperations.handleEventDrop(dropInfo);
    }
  };

  // Wrapper for handleEventResize to show modal for recurring events
  const handleEventResizeWrapper = (resizeInfo) => {
    const { event } = resizeInfo;
    if (event.isRecurringInstance) {
      setPendingUpdate({ type: 'resize', data: resizeInfo });
      setShowRecurringUpdateModal(true);
    } else {
      eventOperations.handleEventResize(resizeInfo);
    }
  };

  // Handle recurring update confirmation
  const handleRecurringUpdateConfirm = (updateOption) => {
    if (pendingUpdate) {
      if (pendingUpdate.type === 'drop') {
        eventOperations.handleEventDrop(pendingUpdate.data, updateOption);
      } else if (pendingUpdate.type === 'resize') {
        eventOperations.handleEventResize(pendingUpdate.data, updateOption);
      }
    }
    setShowRecurringUpdateModal(false);
    setPendingUpdate(null);
  };

  // Get filtered data using context functions with useMemo
  const filteredEvents = useMemo(() =>
    getFilteredEvents(eventsData.allEvents, userEmail),
    [getFilteredEvents, eventsData.allEvents, userEmail]
  );

  const applicableAvailabilities = useMemo(() =>
    getFilteredAvailabilities(eventsData.splitAvailabilitiesData),
    [getFilteredAvailabilities, eventsData.splitAvailabilitiesData]
  );

  // Combine filtered events, student requests, and availabilities based on user role and visibility
  const finalEvents = useMemo(() => {
    if (!uiState.showEvents) return [];

    const baseEvents = filteredEvents;

    if (userRole === 'tutor') {
      if (filterState.filters.visibility.hideOwnAvailabilities) {
        return baseEvents;
      }
      const tutorAvailabilities = eventsData.splitAvailabilitiesData.filter(
        avail => avail.tutor === userEmail
      );
      return [...baseEvents, ...tutorAvailabilities];
    }

    if (userRole === 'student') {
      return [...baseEvents, ...eventsData.studentRequests];
    }

    // Teachers
    if (filterState.filters.visibility.hideDeniedStudentEvents) {
      const approvedRequests = eventsData.studentRequests.filter(
        request => request.approvalStatus !== 'denied'
      );
      return [...baseEvents, ...approvedRequests];
    }
    return [...baseEvents, ...eventsData.studentRequests];
  }, [
    uiState.showEvents,
    userRole,
    userEmail,
    filteredEvents,
    eventsData.splitAvailabilitiesData,
    eventsData.studentRequests,
    filterState.filters.visibility.hideOwnAvailabilities,
    filterState.filters.visibility.hideDeniedStudentEvents
  ]);

  const minTime = parse(calendarStartTime, "HH:mm", new Date());
  const maxTime = parse(calendarEndTime, "HH:mm", new Date());

  const uniqueTutors = eventsData.tutors.map(tutor => ({ value: tutor.email, label: tutor.name || tutor.email }));

  const filteredTutors = filterState.filters.subject?.tutors?.map(tutor => ({
    value: tutor.email,
    label: tutor.name || tutor.email
  })) || [];

  const currentWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekEnd.getDate() + 7);

  const calendarContainerStyle = {
    backgroundColor: '#ffffff',
    color: '#000000'
  };

  const calendarPanelStyle = {
    paddingRight: '3rem',
    backgroundColor: '#ffffff',
    color: '#000000'
  };

  if (eventsData.loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="tw-flex tw-h-full" style={calendarContainerStyle}>
      <div className="tw-flex-1 tw-p-5 tw-overflow-hidden tw-relative" style={calendarPanelStyle}>
        {isMobile ? (
          <Calendar
            localizer={localizer}
            events={finalEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '600px' }}
            min={minTime}
            max={maxTime}
            onSelectSlot={calendarInteractions.handleSelectSlot}
            onSelectEvent={calendarInteractions.handleSelectEvent}
            selectable
            popup
            date={currentDate}
            onNavigate={setCurrentDate}
            view={Views.DAY}
            onView={setCurrentView}
            views={[Views.DAY]}
            messages={messages}
            eventPropGetter={(event) => eventStyleGetter(event, userRole, userEmail)}
            step={30}
            timeslots={2}
            longPressThreshold={10}
            components={{
              event: (props) => (
                <MemoizedCustomEvent
                  {...props}
                  showInitials={uiState.showInitials}
                />
              )
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
            onSelectSlot={calendarInteractions.handleSelectSlot}
            onSelectEvent={calendarInteractions.handleSelectEvent}
            onEventDrop={handleEventDropWrapper}
            onEventResize={handleEventResizeWrapper}
            resizable
            selectable
            longPressThreshold={500}
            date={currentDate}
            onNavigate={setCurrentDate}
            view={currentView}
            onView={setCurrentView}
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            messages={messages}
            eventPropGetter={(event) => eventStyleGetter(event, userRole, userEmail)}
            components={{
              event: (props) => (
                <MemoizedCustomEvent
                  {...props}
                  userRole={userRole}
                  userEmail={userEmail}
                  currentView={currentView}
                  onDuplicate={calendarInteractions.handleDuplicateEvent}
                />
              ),
              timeSlotWrapper: (props) => (
                <MemoizedCalendarTimeSlotWrapper
                  {...props}
                  applicableAvailabilities={uiState.showInitials ? applicableAvailabilities : []}
                  selectedTutors={filterState.filters.tutors}
                  currentWeekStart={currentWeekStart}
                  currentWeekEnd={currentWeekEnd}
                />
              ),
            }}
          />
        )}
      </div>
      
      <MemoizedCalendarFilterPanel
        uiState={uiState}
        userRole={userRole}
        eventsData={eventsData}
        filterState={filterState}
        filteredTutors={filteredTutors}
        uniqueTutors={uniqueTutors}
      />

      {/* render different forms depending on role */}
      {forms.showTeacherForm && userRole === 'teacher' && (
        <EventForm
          isEditing={forms.isEditing}
          newEvent={calendarInteractions.newEvent}
          setNewEvent={calendarInteractions.setNewEvent}
          eventToEdit={forms.eventToEdit}
          setShowModal={forms.setShowTeacherForm}
          eventsData={eventsData}
        />
      )}
      {forms.showStudentForm && userRole === 'student' && (
        <StudentEventForm
          isEditing={forms.isEditing}
          newEvent={calendarInteractions.newEvent}
          setNewEvent={calendarInteractions.setNewEvent}
          eventToEdit={forms.eventToEdit}
          setShowStudentModal={forms.setShowStudentForm}
          studentEmail={userEmail}
          eventsData={eventsData}
          handleInputChange={studentEventForm.handleInputChange(calendarInteractions.newEvent, calendarInteractions.setNewEvent)}
          handleSubmit={studentEventForm.handleSubmit(calendarInteractions.newEvent, forms.isEditing, forms.eventToEdit, forms.setShowStudentForm)}
          handleDelete={studentEventForm.handleDelete(forms.eventToEdit, forms.setShowStudentForm)}
        />
      )}
      {forms.showAvailabilityForm && userRole === 'tutor' && (
        <TutorAvailabilityForm
          isEditing={forms.isEditing}
          newAvailability={calendarInteractions.newAvailability}
          setNewAvailability={calendarInteractions.setNewAvailability}
          eventToEdit={forms.eventToEdit}
          setShowModal={forms.setShowAvailabilityForm}
          eventsData={eventsData}
          handleInputChange={tutorAvailabilityForm.handleInputChange(calendarInteractions.newAvailability, calendarInteractions.setNewAvailability)}
          handleSubmit={tutorAvailabilityForm.handleSubmit(calendarInteractions.newAvailability, forms.isEditing, forms.eventToEdit, forms.setShowAvailabilityForm)}
          handleDelete={tutorAvailabilityForm.handleDelete(forms.eventToEdit, forms.setShowAvailabilityForm)}
        />
      )}
      {forms.showDetailsModal && forms.eventToEdit && (
        <EventDetailsModal
          key={forms.eventToEdit.id}
          event={forms.eventToEdit}
          onClose={() => forms.setShowDetailsModal(false)}
          handleConfirmation={eventOperations.handleConfirmation}
          userEmail={userEmail}
          userRole={userRole}
          events={eventsData.allEvents}
          setEvents={eventsData.setAllEvents}
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
 * React Big Calendar Wrapper based on role and email
 * @returns 
 */
const CalendarWrapper = ({ userRole, userEmail }) => {
  return (
    <CalendarProvider userRole={userRole} userEmail={userEmail}>
      <CalendarContent />
    </CalendarProvider>
  );
};

export default CalendarWrapper;
