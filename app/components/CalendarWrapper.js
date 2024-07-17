import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Select from 'react-select';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { fetchEvents, fetchAvailabilities, fetchSubjectsWithTutors } from './calendar/fetchData';
import {
  handleSelectSlot,
  handleSelectEvent,
  handleEventDrop,
  handleEventResize,
  handleInputChange,
  handleSubmit,
  handleDelete,
  handleStaffChange,
  handleClassChange,
  handleStudentChange,
  handleAvailabilityChange,
  handleAvailabilitySubmit,
  handleConfirmation,
} from './calendar/handlers';
import { eventStyleGetter, customDayPropGetter, customSlotPropGetter, messages } from './calendar/helpers';
import { splitAvailabilities } from './calendar/availabilityUtils';
import EventForm from './EventForm';
import AvailabilityForm from './AvailabilityForm';
import StudentEventForm from './StudentEventForm';
import EventDetailsModal from './EventDetailsModal';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

moment.updateLocale('en', { week: { dow: 1 } });

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

const CalendarWrapper = ({ userRole, userEmail, calendarStartTime, calendarEndTime }) => {
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState(Views.MONTH);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [newEvent, setNewEvent] = useState({});
  const [newAvailability, setNewAvailability] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [eventToEdit, setEventToEdit] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedTutors, setSelectedTutors] = useState([]);
  const [hideOwnAvailabilities, setHideOwnAvailabilities] = useState(false);
  const [hideDeniedStudentEvents, setHideDeniedStudentEvents] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);

  useEffect(() => {
    fetchEvents(userRole, userEmail, setEvents, setAllEvents);
    fetchAvailabilities(setAvailabilities);
    fetchSubjectsWithTutors(setSubjects);
  }, [userRole, userEmail]);

  const splitAvailabilitiesData = splitAvailabilities(availabilities, allEvents);

  const filteredEvents = events.filter(event => {
    if (userRole === 'tutor' && hideOwnAvailabilities && event.tutor === userEmail) {
      return false;
    }
    if ((userRole === 'tutor' || userRole === 'teacher') && hideDeniedStudentEvents && event.createdByStudent && event.approvalStatus === 'denied') {
      return false;
    }
    return true;
  });

  const finalEvents = userRole === 'tutor'
    ? [
        ...filteredEvents,
        ...splitAvailabilitiesData.filter(avail => avail.tutor === userEmail && !hideOwnAvailabilities)
      ]
    : filteredEvents;

  const minTime = moment(calendarStartTime, "HH:mm").toDate();
  const maxTime = moment(calendarEndTime, "HH:mm").toDate();

  const filteredTutors = selectedSubject ? selectedSubject.tutors.map(tutor => ({ value: tutor.email, label: tutor.name || tutor.email })) : [];

  return (
    <div className="calendar-container">
      <div className="calendar-panel">
        <DnDCalendar
          localizer={localizer}
          events={finalEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          min={minTime}
          max={maxTime}
          onSelectSlot={(slotInfo) => handleSelectSlot(slotInfo, userRole, setNewEvent, setNewAvailability, setIsEditing, setShowTeacherModal, setShowStudentModal, setShowAvailabilityModal, userEmail)}
          onSelectEvent={(event) => handleSelectEvent(event, userRole, userEmail, setNewEvent, setNewAvailability, setIsEditing, setEventToEdit, setShowTeacherModal, setShowStudentModal, setShowAvailabilityModal, setShowDetailsModal)}
          onEventDrop={(event) => handleEventDrop(event, events, availabilities, setEvents, setAvailabilities, userRole)}
          onEventResize={(event) => handleEventResize(event, events, availabilities, setEvents, setAvailabilities, userRole)}
          resizable
          selectable
          date={currentDate}
          onNavigate={setCurrentDate}
          view={currentView}
          onView={setCurrentView}
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          messages={messages}
          eventPropGetter={(event) => eventStyleGetter(event, userRole, userEmail)}
          slotPropGetter={(date) => customSlotPropGetter(date, splitAvailabilitiesData, selectedTutors)}
        />
      </div>
      <div className={`filter-panel ${isFilterPanelOpen ? 'open' : 'collapsed'}`}>
        <div className="collapse-button" onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}>
          {isFilterPanelOpen ? <FiChevronRight /> : <FiChevronLeft />}
        </div>
        {isFilterPanelOpen && (
          <div className="filter-content">
            <h3 className="filter-title">Filters</h3>
            <Select
              name="subjects"
              options={subjects}
              value={selectedSubject}
              onChange={setSelectedSubject}
              className="basic-select"
              classNamePrefix="select"
              placeholder="Select a subject"
            />
            <Select
              isMulti
              name="tutors"
              options={filteredTutors}
              value={selectedTutors}
              onChange={setSelectedTutors}
              className="basic-multi-select"
              classNamePrefix="select"
              placeholder="Select tutors to view availabilities"
              isDisabled={!selectedSubject}
            />
            {userRole === 'tutor' && (
              <div className="checkbox-group">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={hideOwnAvailabilities}
                    onChange={(e) => setHideOwnAvailabilities(e.target.checked)}
                  />
                  <span className="ml-2">Hide My Own Availabilities</span>
                </label>
              </div>
            )}
            {(userRole === 'tutor' || userRole === 'teacher') && (
              <div className="checkbox-group">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={hideDeniedStudentEvents}
                    onChange={(e) => setHideDeniedStudentEvents(e.target.checked)}
                  />
                  <span className="ml-2">Hide Denied Student Events</span>
                </label>
              </div>
            )}
          </div>
        )}
      </div>
      {showTeacherModal && userRole === 'teacher' && (
        <EventForm
          isEditing={isEditing}
          newEvent={newEvent}
          setNewEvent={setNewEvent}
          handleInputChange={(e) => handleInputChange(e, setNewEvent, newEvent)}
          handleSubmit={(e) => handleSubmit(e, isEditing, newEvent, eventToEdit, setEvents, events, setShowTeacherModal)}
          handleDelete={() => handleDelete(eventToEdit, events, setEvents, availabilities, setAvailabilities, setShowTeacherModal, setShowAvailabilityModal)}
          setShowModal={setShowTeacherModal}
          handleStaffChange={(selectedStaff) => handleStaffChange(selectedStaff, setNewEvent, newEvent)}
          handleClassChange={(selectedClasses) => handleClassChange(selectedClasses, setNewEvent, newEvent)}
          handleStudentChange={(selectedStudents) => handleStudentChange(selectedStudents, setNewEvent, newEvent)}
        />
      )}
      {showStudentModal && userRole === 'student' && (
        <StudentEventForm
          isEditing={isEditing}
          newEvent={newEvent}
          setNewEvent={setNewEvent}
          handleInputChange={(e) => handleInputChange(e, setNewEvent, newEvent)}
          handleSubmit={(e) => handleSubmit(e, isEditing, newEvent, eventToEdit, setEvents, events, setShowStudentModal)}
          handleDelete={() => handleDelete(eventToEdit, events, setEvents, availabilities, setAvailabilities, setShowStudentModal, setShowAvailabilityModal)}
          setShowStudentModal={setShowStudentModal}
          studentEmail={userEmail}
        />
      )}
      {showAvailabilityModal && userRole === 'tutor' && (
        <AvailabilityForm
          isEditing={isEditing}
          newAvailability={newAvailability}
          setNewAvailability={setNewAvailability}
          handleInputChange={(e) => handleAvailabilityChange(e, setNewAvailability, newAvailability)}
          handleSubmit={(e) => handleAvailabilitySubmit(e, isEditing, newAvailability, eventToEdit, setAvailabilities, availabilities, setShowAvailabilityModal)}
          handleDelete={() => handleDelete(eventToEdit, events, setEvents, availabilities, setAvailabilities, setShowAvailabilityModal)}
          setShowModal={setShowAvailabilityModal}
        />
      )}
      {showDetailsModal && (
        <EventDetailsModal
          event={eventToEdit}
          handleClose={() => setShowDetailsModal(false)}
          handleConfirmation={(confirmed) => handleConfirmation(eventToEdit, confirmed, userRole, userEmail, events, setEvents)}
          userEmail={userEmail}
          userRole={userRole}
        />
      )}
    </div>
  );
};

export default CalendarWrapper;
