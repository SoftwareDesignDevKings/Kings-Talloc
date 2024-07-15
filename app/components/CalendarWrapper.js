import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Select from 'react-select';
import { fetchEvents, fetchAvailabilities, fetchTutors } from './calendar/fetchData';
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
  handleBookingSubmit,
} from './calendar/handlers';
import { eventStyleGetter, customDayPropGetter, customSlotPropGetter, messages } from './calendar/helpers';
import { splitAvailabilities } from './calendar/availabilityUtils';
import EventForm from './EventForm';
import AvailabilityForm from './AvailabilityForm';
import EventDetailsModal from './EventDetailsModal';
import BookingForm from './BookingForm';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

moment.updateLocale('en', { week: { dow: 1 } });

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

const CalendarWrapper = ({ userRole, userEmail }) => {
  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState(Views.MONTH);
  const [showModal, setShowModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [newEvent, setNewEvent] = useState({});
  const [newAvailability, setNewAvailability] = useState({});
  const [bookingDetails, setBookingDetails] = useState({
    studentEmail: userEmail,
    tutor: null,
    description: '',
    start: '',
    end: ''
  });e
  const [isEditing, setIsEditing] = useState(false);
  const [eventToEdit, setEventToEdit] = useState(null);
  const [tutors, setTutors] = useState([]);
  const [selectedTutors, setSelectedTutors] = useState([]);

  useEffect(() => {
    fetchEvents(userRole, userEmail, setEvents, setAllEvents);
    fetchAvailabilities(setAvailabilities);
    fetchTutors(setTutors);
  }, [userRole, userEmail]);

  const splitAvailabilitiesData = splitAvailabilities(availabilities, allEvents);

  const handleSelectSlotWrapper = (slotInfo) => {
    const start = moment(slotInfo.start).toISOString();
    const end = moment(slotInfo.end).toISOString();

    setBookingDetails({
      studentEmail: userEmail,
      tutor: null,
      description: '',
      start,
      end,
    });

    handleSelectSlot(
      slotInfo, 
      userRole, 
      setNewEvent, 
      setNewAvailability, 
      setIsEditing, 
      setShowModal, 
      setShowAvailabilityModal, 
      setShowBookingModal, 
      setBookingDetails, 
      userEmail
    );
  };

  return (
    <div className="relative">
      <div className="w-full p-4 bg-white rounded-lg shadow-lg mb-4">
        <Select
          isMulti
          name="tutors"
          options={tutors}
          value={selectedTutors}
          onChange={setSelectedTutors}
          className="basic-multi-select"
          classNamePrefix="select"
          placeholder="Select tutors to view availabilities"
        />
      </div>
      <div className="w-full p-4 bg-white rounded-lg shadow-lg">
        <DnDCalendar
          localizer={localizer}
          events={userRole === 'tutor' ? [...events, ...splitAvailabilitiesData.filter(avail => avail.tutor === userEmail)] : events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '600px' }}
          onSelectSlot={handleSelectSlotWrapper}
          onSelectEvent={(event) => handleSelectEvent(event, userRole, userEmail, setNewEvent, setNewAvailability, setIsEditing, setEventToEdit, setShowModal, setShowAvailabilityModal, setShowDetailsModal, setShowBookingModal, setBookingDetails)}
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
          dayPropGetter={(date) => customDayPropGetter(date, splitAvailabilitiesData, selectedTutors)}
          slotPropGetter={(date) => customSlotPropGetter(date, splitAvailabilitiesData, selectedTutors)}
        />
      </div>
      {showModal && userRole === 'teacher' && (
        <EventForm
          isEditing={isEditing}
          newEvent={newEvent}
          setNewEvent={setNewEvent}
          handleInputChange={(e) => handleInputChange(e, setNewEvent, newEvent)}
          handleSubmit={(e) => handleSubmit(e, isEditing, newEvent, eventToEdit, setEvents, events, setShowModal)}
          handleDelete={() => handleDelete(eventToEdit, events, setEvents, availabilities, setAvailabilities, setShowModal, setShowAvailabilityModal)}
          setShowModal={setShowModal}
          handleStaffChange={(selectedStaff) => handleStaffChange(selectedStaff, setNewEvent, newEvent)}
          handleClassChange={(selectedClasses) => handleClassChange(selectedClasses, setNewEvent, newEvent)}
          handleStudentChange={(selectedStudents) => handleStudentChange(selectedStudents, setNewEvent, newEvent)}
        />
      )}
      {showAvailabilityModal && userRole === 'tutor' && (
        <AvailabilityForm
          isEditing={isEditing}
          newAvailability={newAvailability}
          setNewAvailability={setNewAvailability}
          handleInputChange={(e) => handleAvailabilityChange(e, setNewAvailability, newAvailability)}
          handleSubmit={(e) => handleAvailabilitySubmit(e, isEditing, newAvailability, eventToEdit, setAvailabilities, availabilities, setShowAvailabilityModal)}
          handleDelete={() => handleDelete(eventToEdit, events, setEvents, availabilities, setAvailabilities, setShowModal, setShowAvailabilityModal)}
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
      {showBookingModal && userRole === 'student' && (
        <BookingForm
          isEditing={isEditing}
          bookingDetails={bookingDetails}
          setBookingDetails={setBookingDetails}
          handleInputChange={(e) => handleInputChange(e, setBookingDetails, bookingDetails)}
          handleSubmit={(e) => handleBookingSubmit(e, bookingDetails, setShowBookingModal)}
          handleDelete={() => handleDelete(eventToEdit, events, setEvents, availabilities, setAvailabilities, setShowBookingModal)}
          setShowModal={setShowBookingModal}
        />
      )}
    </div>
  );
};

export default CalendarWrapper;
