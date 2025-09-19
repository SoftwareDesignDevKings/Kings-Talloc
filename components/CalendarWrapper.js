import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Select from 'react-select';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { fetchEvents, fetchAvailabilities, fetchSubjectsWithTutors, fetchTutors } from '../firebase/fetchData';
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
import { eventStyleGetter, messages } from './calendar/helpers';
import { splitAvailabilities } from './calendar/availabilityUtils';
import EventForm from './EventForm';
import TutorAvailabilityForm from './TutorAvailabilityForm.jsx';
import StudentEventForm from './StudentEventForm';
import EventDetailsModal from './EventDetailsModal';
import CustomTimeSlotWrapper from './CustomTimeSlotWrapper';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

moment.updateLocale('en', { week: { dow: 1 } });

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

const CalendarWrapper = ({ userRole, userEmail, calendarStartTime, calendarEndTime }) => {
  const [allEvents, setAllEvents] = useState([]); // Master list of all events
  const [availabilities, setAvailabilities] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState(Views.WEEK);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [newEvent, setNewEvent] = useState({});
  const [newAvailability, setNewAvailability] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [eventToEdit, setEventToEdit] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedTutors, setSelectedTutors] = useState([]);
  const [students, setStudents] = useState([]);
  const [hideOwnAvailabilities, setHideOwnAvailabilities] = useState(false);
  const [hideDeniedStudentEvents, setHideDeniedStudentEvents] = useState(false);
  const [hideTutoringAvailabilites, setHideTutoringAvailabilites] = useState(false);
  const [hideWorkAvailabilities, setHideWorkAvailabilities] = useState(false);

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showInitials, setShowInitials] = useState(true);

  useEffect(() => {
    // Fetch all events and setAllEvents
    fetchEvents(userRole, userEmail, setAllEvents, setAllEvents, setStudents);
    fetchAvailabilities(setAvailabilities);
    fetchSubjectsWithTutors(setSubjects);
    fetchTutors(setTutors);
  }, [userRole, userEmail]);

  // Split availabilities based on allEvents
  const splitAvailabilitiesData = useMemo(() => splitAvailabilities(availabilities, allEvents), [availabilities, allEvents]);

  // Derive filtered events based on allEvents and filters
  const filteredEvents = useMemo(() => {
    let filtered = [...allEvents];

    // Apply role-based filters
    if (userRole === 'tutor') {
      filtered = filtered.filter(event =>
        event.staff.some(staff => staff.value === userEmail)
      );

      if (hideOwnAvailabilities) {
        filtered = filtered.filter(event => event.tutor !== userEmail);
      }
    }

    if ((userRole === 'tutor' || userRole === 'teacher') && hideDeniedStudentEvents) {
      filtered = filtered.filter(event =>
        !(event.createdByStudent && event.approvalStatus === 'denied')
      );
    }

    // Apply tutor filter
    if (selectedTutors.length > 0) {
      const selectedTutorValues = selectedTutors.map(tutor => tutor.value);
      filtered = filtered.filter(event =>
        event.staff.some(staff => selectedTutorValues.includes(staff.value))
      );
    }

    return filtered;
  }, [allEvents, userRole, userEmail, hideOwnAvailabilities, hideDeniedStudentEvents, selectedTutors]);

  // Derive filtered availabilities based on selectedSubject and selectedTutors
  const applicableAvailabilities = useMemo(() => {
    let filtered = splitAvailabilitiesData

    if (userRole == "student") {
      filtered = filtered.filter(availability =>
        (availability.workType === 'tutoring' || availability.workType === 'tutoringOrWork' || availability.workType == undefined)
      );
    }

    if ((userRole === 'tutor' || userRole === 'teacher') && hideTutoringAvailabilites) {
      filtered = filtered.filter(availability =>
        !(availability.workType === 'tutoring')
      );
    }

    if ((userRole === 'tutor' || userRole === 'teacher') && hideWorkAvailabilities) {
      filtered = filtered.filter(availability =>
        !(availability.workType === 'work')
      );
    }

    if ((userRole === 'tutor' || userRole === 'teacher') && hideTutoringAvailabilites && hideWorkAvailabilities) {
      filtered = filtered.filter(availability =>
        !(availability.workType === 'tutoringOrWork')
      );
    }

    if (selectedSubject) {
      if (selectedTutors.length > 0) {
        // Filter availabilities based on selected tutors
        return filtered.filter(avail =>
          selectedTutors.some(tutor => tutor.value === avail.tutor)
        );
      } else {
        // Filter availabilities based on the selected subject's tutors
        return filtered.filter(avail =>
          selectedSubject.tutors.some(tutor => tutor.email === avail.tutor)
        );
      }
    }
    // If no subject is selected, filter based on selected tutors if any
    if (selectedTutors.length > 0) {
      return filtered.filter(avail =>
        selectedTutors.some(tutor => tutor.value === avail.tutor)
      );
    }
    // Default to all availabilities if no filters are applied
    return filtered;
  }, [splitAvailabilitiesData, userRole, hideTutoringAvailabilites, hideWorkAvailabilities, selectedSubject, selectedTutors]);

  // Combine filtered events and availabilities based on user role and visibility
  const finalEvents = useMemo(() => {
    if (!showEvents) return [];

    if (userRole === 'tutor') {
      const tutorAvailabilities = splitAvailabilitiesData.filter(avail => avail.tutor === userEmail && !hideOwnAvailabilities);
      return [...filteredEvents, ...tutorAvailabilities];
    }

    return filteredEvents;
  }, [showEvents, userRole, userEmail, filteredEvents, splitAvailabilitiesData, hideOwnAvailabilities]);

  const minTime = moment(calendarStartTime, "HH:mm").toDate();
  const maxTime = moment(calendarEndTime, "HH:mm").toDate();

  const uniqueTutors = tutors.map(tutor => ({ value: tutor.email, label: tutor.name || tutor.email }));

  const filteredTutors = selectedSubject?.tutors?.map(tutor => ({
    value: tutor.email,
    label: tutor.name || tutor.email
  })) || [];

  const handleTutorFilterChange = (selectedOptions) => {
    setSelectedTutors(selectedOptions);
    // No need to manually set events; filteredEvents will update via useMemo
  };

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
          style={{ height: '100%' }}
          min={minTime}
          max={maxTime}
          onSelectSlot={(slotInfo) => handleSelectSlot(slotInfo, userRole, setNewEvent, setNewAvailability, setIsEditing, setShowTeacherModal, setShowStudentModal, setShowAvailabilityModal, userEmail)}
          onSelectEvent={(event) => handleSelectEvent(event, userRole, userEmail, setNewEvent, setNewAvailability, setIsEditing, setEventToEdit, setShowTeacherModal, setShowStudentModal, setShowAvailabilityModal, setShowDetailsModal)}
          onEventDrop={(dropInfo) => handleEventDrop(dropInfo, allEvents, availabilities, setAllEvents, setAvailabilities, userRole)}
          onEventResize={(resizeInfo) => handleEventResize(resizeInfo, allEvents, availabilities, setAllEvents, setAvailabilities, userRole)}
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
                applicableAvailabilities={showInitials ? applicableAvailabilities : []}
                selectedTutors={selectedTutors}
                currentWeekStart={currentWeekStart}
                currentWeekEnd={currentWeekEnd}
              />
            ),
          }}
        />
      </div>
      
      {/* panel for views on calendar */}
      <div className={`filter-panel ${isFilterPanelOpen ? 'open' : 'collapsed'}`}>
        <div className="collapse-button" onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}>
          {isFilterPanelOpen ? <FiChevronRight /> : <FiChevronLeft />}
        </div>
        {isFilterPanelOpen && (
          <div className="filter-content">
            <h3 className="filter-title">Filters</h3>
            {userRole === 'student' && (
              <>
                <Select
                  name="subjects"
                  options={subjects.map(subject => ({ value: subject.id, label: subject.name }))}
                  value={selectedSubject ? { value: selectedSubject.id, label: selectedSubject.name } : null}
                  onChange={(option) => setSelectedSubject(subjects.find(subject => subject.id === option.value))}
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
              </>
            )}
            {(userRole === 'tutor' || userRole === 'teacher') && (
              <Select
                isMulti
                name="tutors"
                options={uniqueTutors}
                value={selectedTutors}
                onChange={handleTutorFilterChange}
                className="basic-multi-select"
                classNamePrefix="select"
                placeholder="Select tutors"
              />
            )}
            <div className="checkbox-group">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showEvents}
                  onChange={(e) => setShowEvents(e.target.checked)}
                />
                <span className="ml-2">Show Events</span>
              </label>
            </div>
            <div className="checkbox-group">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showInitials}
                  onChange={(e) => setShowInitials(e.target.checked)}
                />
                <span className="ml-2">Show Tutor Availabilities</span>
              </label>
            </div>
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
              <div>
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
                <div className="checkbox-group">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={hideTutoringAvailabilites}
                      onChange={(e) => setHideTutoringAvailabilites(e.target.checked)}
                    />
                    <span className="ml-2">Hide Tutoring Availabilities</span>
                  </label>
                </div>
                <div className="checkbox-group">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={hideWorkAvailabilities}
                      onChange={(e) => setHideWorkAvailabilities(e.target.checked)}
                    />
                    <span className="ml-2">Hide Work Availabilities</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* render different modals depending on role */}
      {showTeacherModal && userRole === 'teacher' && (
        <EventForm
          isEditing={isEditing}
          newEvent={newEvent}
          setNewEvent={setNewEvent}
          handleInputChange={(e) => handleInputChange(e, setNewEvent, newEvent)}
          handleSubmit={(e) => handleSubmit(e, isEditing, newEvent, eventToEdit, setAllEvents, allEvents, setShowTeacherModal)}
          handleDelete={() => handleDelete(eventToEdit, allEvents, setAllEvents, availabilities, setAvailabilities, setShowTeacherModal)}
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
          handleSubmit={(e) => handleSubmit(e, isEditing, newEvent, eventToEdit, setAllEvents, allEvents, setShowStudentModal)}
          handleDelete={() => handleDelete(eventToEdit, allEvents, setAllEvents, availabilities, setAvailabilities, setShowStudentModal)}
          setShowStudentModal={setShowStudentModal}
          studentEmail={userEmail}
        />
      )}
      {showAvailabilityModal && userRole === 'tutor' && (
        <TutorAvailabilityForm
          isEditing={isEditing}
          newAvailability={newAvailability}
          setNewAvailability={setNewAvailability}
          handleInputChange={(e) => handleAvailabilityChange(e, setNewAvailability, newAvailability)}
          handleSubmit={(e) => handleAvailabilitySubmit(e, isEditing, newAvailability, eventToEdit, setAvailabilities, availabilities, setShowAvailabilityModal)}
          handleDelete={() => handleDelete(eventToEdit, allEvents, setAllEvents, availabilities, setAvailabilities, setShowAvailabilityModal)}
          setShowModal={setShowAvailabilityModal}
        />
      )}
      {showDetailsModal && (
        <EventDetailsModal
          event={eventToEdit}
          handleClose={() => setShowDetailsModal(false)}
          handleConfirmation={(confirmed) => handleConfirmation(eventToEdit, confirmed, userRole, userEmail, allEvents, setAllEvents)}
          userEmail={userEmail}
          userRole={userRole}
          events={allEvents}
          setEvents={setAllEvents}
        />
      )}
    </div>
  );
};

export default CalendarWrapper;
