"use client";

import React, { useState, useMemo } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import Select from 'react-select';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { eventStyleGetter, messages } from './calendar/helpers';
import EventForm from './EventForm';
import TutorAvailabilityForm from './TutorAvailabilityForm.jsx';
import StudentEventForm from './StudentEventForm';
import EventDetailsModal from './EventDetailsModal';
import CustomTimeSlotWrapper from './CustomTimeSlotWrapper';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';

// Context and Provider
import { CalendarProvider } from '@/providers/CalendarProvider';
import { useCalendarContext } from '@contexts/CalendarContext';

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

  // Get everything from context - much cleaner with no confusing naming!
  const {
    eventsData,
    uiState,
    filterState,
    modals,
    handlers,
    getFilteredEvents,
    getFilteredAvailabilities,
    userRole,
    userEmail
  } = useCalendarContext();

  // Get filtered data using context functions with memoization
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
          onSelectSlot={handlers.handleSelectSlot}
          onSelectEvent={handlers.handleSelectEvent}
          onEventDrop={handlers.handleEventDrop}
          onEventResize={handlers.handleEventResize}
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
              <CustomTimeSlotWrapper
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
      
      {/* panel for views on calendar */}
      <div className={`filter-panel ${uiState.isFilterPanelOpen ? 'open' : 'collapsed'}`}>
        <div className="collapse-button" onClick={() => uiState.setIsFilterPanelOpen(!uiState.isFilterPanelOpen)}>
          {uiState.isFilterPanelOpen ? <FiChevronRight /> : <FiChevronLeft />}
        </div>
        {uiState.isFilterPanelOpen && (
          <div className="filter-content">
            <h3 className="filter-title">Filters</h3>
            {userRole === 'student' && (
              <>
                <Select
                  name="subjects"
                  options={eventsData.subjects.map(subject => ({ value: subject.id, label: subject.name }))}
                  value={filterState.filters.subject ? { value: filterState.filters.subject.id, label: filterState.filters.subject.name } : null}
                  onChange={(option) => filterState.filterActions.setSelectedSubject(eventsData.subjects.find(subject => subject.id === option.value))}
                  className="basic-select"
                  classNamePrefix="select"
                  placeholder="Select a subject"
                />
                <Select
                  isMulti
                  name="tutors"
                  options={filteredTutors}
                  value={filterState.filters.tutors}
                  onChange={filterState.filterActions.setSelectedTutors}
                  className="basic-multi-select"
                  classNamePrefix="select"
                  placeholder="Select tutors to view availabilities"
                  isDisabled={!filterState.filters.subject}
                />
              </>
            )}
            {(userRole === 'tutor' || userRole === 'teacher') && (
              <Select
                isMulti
                name="tutors"
                options={uniqueTutors}
                value={filterState.filters.tutors}
                onChange={filterState.filterActions.handleTutorFilterChange}
                className="basic-multi-select"
                classNamePrefix="select"
                placeholder="Select tutors"
              />
            )}
            <div className="checkbox-group">
              <label className="tw-flex tw-items-center">
                <input
                  type="checkbox"
                  checked={uiState.showEvents}
                  onChange={(e) => uiState.setShowEvents(e.target.checked)}
                />
                <span className="tw-ml-2">Show Events</span>
              </label>
            </div>
            <div className="checkbox-group">
              <label className="tw-flex tw-items-center">
                <input
                  type="checkbox"
                  checked={uiState.showInitials}
                  onChange={(e) => uiState.setShowInitials(e.target.checked)}
                />
                <span className="tw-ml-2">Show Tutor Availabilities</span>
              </label>
            </div>
            {userRole === 'tutor' && (
              <div className="checkbox-group">
                <label className="tw-flex tw-items-center">
                  <input
                    type="checkbox"
                    checked={filterState.filters.visibility.hideOwnAvailabilities}
                    onChange={(e) => filterState.filterActions.setHideOwnAvailabilities(e.target.checked)}
                  />
                  <span className="tw-ml-2">Hide My Own Availabilities</span>
                </label>
              </div>
            )}
            {(userRole === 'tutor' || userRole === 'teacher') && (
              <div className="checkbox-group">
                <label className="tw-flex tw-items-center">
                  <input
                    type="checkbox"
                    checked={filterState.filters.visibility.hideDeniedStudentEvents}
                    onChange={(e) => filterState.filterActions.setHideDeniedStudentEvents(e.target.checked)}
                  />
                  <span className="tw-ml-2">Hide Denied Student Events</span>
                </label>
              </div>
            )}
            {userRole === 'teacher' && (
              <div>
                <div className="checkbox-group">
                  <label className="tw-flex tw-items-center">
                    <input
                      type="checkbox"
                      checked={filterState.filters.visibility.hideTutoringAvailabilites}
                      onChange={(e) => filterState.filterActions.setHideTutoringAvailabilites(e.target.checked)}
                    />
                    <span className="tw-ml-2">Hide Tutoring Availabilities</span>
                  </label>
                </div>
                <div className="checkbox-group">
                  <label className="tw-flex tw-items-center">
                    <input
                      type="checkbox"
                      checked={filterState.filters.visibility.hideWorkAvailabilities}
                      onChange={(e) => filterState.filterActions.setHideWorkAvailabilities(e.target.checked)}
                    />
                    <span className="tw-ml-2">Hide Work Availabilities</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* render different modals depending on role */}
      {modals.showTeacherModal && userRole === 'teacher' && (
        <EventForm
          isEditing={modals.isEditing}
          newEvent={handlers.newEvent}
          setNewEvent={handlers.setNewEvent}
          handleInputChange={handlers.handleInputChange}
          handleSubmit={handlers.handleSubmit}
          handleDelete={handlers.handleDelete}
          setShowModal={modals.setShowTeacherModal}
          handleStaffChange={handlers.handleStaffChange}
          handleClassChange={handlers.handleClassChange}
          handleStudentChange={handlers.handleStudentChange}
        />
      )}
      {modals.showStudentModal && userRole === 'student' && (
        <StudentEventForm
          isEditing={modals.isEditing}
          newEvent={handlers.newEvent}
          setNewEvent={handlers.setNewEvent}
          handleInputChange={handlers.handleInputChange}
          handleSubmit={handlers.handleStudentSubmit}
          handleDelete={handlers.handleDelete}
          setShowStudentModal={modals.setShowStudentModal}
          studentEmail={userEmail}
        />
      )}
      {modals.showAvailabilityModal && userRole === 'tutor' && (
        <TutorAvailabilityForm
          isEditing={modals.isEditing}
          newAvailability={handlers.newAvailability}
          setNewAvailability={handlers.setNewAvailability}
          handleInputChange={handlers.handleAvailabilityChange}
          handleSubmit={handlers.handleAvailabilitySubmit}
          handleDelete={handlers.handleDelete}
          setShowModal={modals.setShowAvailabilityModal}
        />
      )}
      {modals.showDetailsModal && (
        <EventDetailsModal
          event={modals.eventToEdit}
          handleClose={() => modals.setShowDetailsModal(false)}
          handleConfirmation={handlers.handleConfirmation}
          userEmail={userEmail}
          userRole={userRole}
          events={eventsData.allEvents}
          setEvents={eventsData.setAllEvents}
        />
      )}
    </div>
  );
};

// Main wrapper component that provides context
const CalendarWrapper = ({ userRole, userEmail }) => {
  return (
    <CalendarProvider userRole={userRole} userEmail={userEmail}>
      <CalendarContent />
    </CalendarProvider>
  );
};

export default CalendarWrapper;
