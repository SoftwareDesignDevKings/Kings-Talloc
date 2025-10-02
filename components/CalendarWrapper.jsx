"use client";

import React, { useState, useMemo } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import { eventStyleGetter, messages } from './calendar/helpers';
import CalendarFilterPanel from './calendar/CalendarFilterPanel.jsx';
import EventForm from './forms/EventForm.jsx';
import TutorAvailabilityForm from './forms/TutorAvailabilityForm.jsx';
import StudentEventForm from './forms/StudentEventForm.jsx';
import EventDetailsModal from './modals/EventDetailsModal.jsx';
import CalendarTimeSlotWrapper from './calendar/CalendarTimeSlotWrapper.jsx';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';

// Context and Provider
import { CalendarProvider } from '@/providers/CalendarProvider';
import { useCalendarContext } from '@contexts/CalendarContext';

// Specialized hooks
import { useCalendarInteractions } from '@/hooks/calendar/useCalendarInteractions';
import { useEventOperations } from '@/hooks/calendar/useEventOperations';
import { useTutorAvailabilityForm } from '@/hooks/forms/useTutorAvailabilityForm';
import { useStudentEventForm } from '@/hooks/forms/useStudentEventForm';

moment.updateLocale('en', { week: { dow: 1 } });

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

// Calendar content component that uses context
const CalendarContent = () => {
  const calendarStartTime = "06:00";
  const calendarEndTime = "22:00";

  // Calendar navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState(Views.WEEK);

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
  const calendarInteractions = useCalendarInteractions(userRole, userEmail, forms);
  const eventOperations = useEventOperations(eventsData, userRole, userEmail);
  const tutorAvailabilityForm = useTutorAvailabilityForm(eventsData);
  const studentEventForm = useStudentEventForm(eventsData);

  // Get filtered data using context functions with useMemo
  const filteredEvents = useMemo(() =>
    getFilteredEvents(eventsData.allEvents, userEmail),
    [getFilteredEvents, eventsData.allEvents, userEmail]
  );

  const applicableAvailabilities = useMemo(() =>
    getFilteredAvailabilities(eventsData.splitAvailabilitiesData),
    [getFilteredAvailabilities, eventsData.splitAvailabilitiesData]
  );

  // Combine filtered events and availabilities based on user role and visibility
  const finalEvents = useMemo(() => {
    if (!uiState.showEvents) return [];

    if (userRole === 'tutor') {
      const tutorAvailabilities = eventsData.splitAvailabilitiesData.filter(
        avail => avail.tutor === userEmail && !filterState.filters.visibility.hideOwnAvailabilities
      );
      return [...filteredEvents, ...tutorAvailabilities];
    }

    return filteredEvents;
  }, [uiState.showEvents, userRole, userEmail, filteredEvents, eventsData.splitAvailabilitiesData, filterState.filters.visibility.hideOwnAvailabilities]);

  const minTime = moment(calendarStartTime, "HH:mm").toDate();
  const maxTime = moment(calendarEndTime, "HH:mm").toDate();

  const uniqueTutors = eventsData.tutors.map(tutor => ({ value: tutor.email, label: tutor.name || tutor.email }));

  const filteredTutors = filterState.filters.subject?.tutors?.map(tutor => ({
    value: tutor.email,
    label: tutor.name || tutor.email
  })) || [];

  const currentWeekStart = moment(currentDate).startOf('week');
  const currentWeekEnd = moment(currentDate).endOf('week');

  return (
    <div className="calendar-container">
      <div className="calendar-panel">
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
          onEventDrop={eventOperations.handleEventDrop}
          onEventResize={eventOperations.handleEventResize}
          resizable
          selectable
          date={currentDate}
          onNavigate={setCurrentDate}
          view={currentView}
          onView={setCurrentView}
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          messages={messages}
          eventPropGetter={(event) => eventStyleGetter(event, userRole, userEmail)}
          components={{
            timeSlotWrapper: (props) => (
              <CalendarTimeSlotWrapper
                {...props}
                applicableAvailabilities={uiState.showInitials ? applicableAvailabilities : []}
                selectedTutors={filterState.filters.tutors}
                currentWeekStart={currentWeekStart}
                currentWeekEnd={currentWeekEnd}
              />
            ),
          }}
        />
      </div>
      
      <CalendarFilterPanel
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
      {forms.showDetailsModal && (
        <EventDetailsModal
          event={forms.eventToEdit}
          handleClose={() => forms.setShowDetailsModal(false)}
          handleConfirmation={eventOperations.handleConfirmation}
          userEmail={userEmail}
          userRole={userRole}
          events={eventsData.allEvents}
          setEvents={eventsData.setAllEvents}
        />
      )}
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
