import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { db } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import EventForm from './EventForm';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

// Set the start of the week to Monday
moment.updateLocale('en', {
  week: {
    dow: 1, // Monday is the first day of the week
  },
});

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

const CalendarWrapper = ({ events, setEvents, userRole, userEmail }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState(Views.MONTH);
  const [showModal, setShowModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', start: '', end: '', staff: [], classes: [], students: [] });
  const [isEditing, setIsEditing] = useState(false);
  const [eventToEdit, setEventToEdit] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      const querySnapshot = await getDocs(collection(db, 'events'));
      const eventsFromDb = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        start: doc.data().start.toDate(),
        end: doc.data().end.toDate(),
      }));

      let filteredEvents;
      if (userRole === 'teacher') {
        filteredEvents = eventsFromDb;
      } else if (userRole === 'tutor') {
        filteredEvents = eventsFromDb.filter(event =>
          event.staff.some(staffMember => staffMember.value === userEmail)
        );
      } else if (userRole === 'student') {
        filteredEvents = eventsFromDb.filter(event =>
          event.students.some(student => student.value === userEmail)
        );
      }

      setEvents(filteredEvents);
    };

    fetchEvents();
  }, [setEvents, userRole, userEmail]);

  const handleSelectSlot = (slotInfo) => {
    if (userRole === 'student') return;
    const start = slotInfo.start;
    const end = new Date(start);
    end.setMinutes(start.getMinutes() + 30); // Set default duration to 30 minutes
    setNewEvent({ title: '', start, end, staff: [], classes: [], students: [] });
    setIsEditing(false);
    setShowModal(true);
  };

  const handleSelectEvent = (event) => {
    if (userRole === 'student') return;
    setNewEvent(event);
    setIsEditing(true);
    setEventToEdit(event);
    setShowModal(true);
  };

  const handleNavigate = (newDate) => {
    setCurrentDate(newDate);
  };

  const handleViewChange = (newView) => {
    setCurrentView(newView);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewEvent({ ...newEvent, [name]: value });
  };

  const handleStaffChange = (selectedStaff) => {
    setNewEvent({ ...newEvent, staff: selectedStaff });
  };

  const handleClassChange = (selectedClasses) => {
    setNewEvent({ ...newEvent, classes: selectedClasses });
  };

  const handleStudentChange = (selectedStudents) => {
    setNewEvent({ ...newEvent, students: selectedStudents });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEditing) {
      const eventDoc = doc(db, 'events', eventToEdit.id);
      await updateDoc(eventDoc, {
        title: newEvent.title,
        start: new Date(newEvent.start),
        end: new Date(newEvent.end),
        staff: newEvent.staff,
        classes: newEvent.classes,
        students: newEvent.students,
      });
      setEvents(events.map(event => event.id === eventToEdit.id ? { ...newEvent, id: eventToEdit.id } : event));
    } else {
      const docRef = await addDoc(collection(db, 'events'), {
        title: newEvent.title,
        start: new Date(newEvent.start),
        end: new Date(newEvent.end),
        staff: newEvent.staff,
        classes: newEvent.classes,
        students: newEvent.students,
      });
      setEvents([...events, { ...newEvent, id: docRef.id }]);
    }
    setShowModal(false);
  };

  const handleDelete = async () => {
    if (eventToEdit && eventToEdit.id) {
      await deleteDoc(doc(db, 'events', eventToEdit.id));
      setEvents(events.filter(event => event.id !== eventToEdit.id));
    }
    setShowModal(false);
  };

  const handleEventDrop = async ({ event, start, end }) => {
    if (userRole === 'student') return;
    const updatedEvent = { ...event, start, end };
    const previousEvents = [...events];

    // Optimistically update the local state
    setEvents(events.map(evt => evt.id === event.id ? updatedEvent : evt));

    try {
      const eventDoc = doc(db, 'events', event.id);
      await updateDoc(eventDoc, {
        start: new Date(start),
        end: new Date(end),
      });
    } catch (error) {
      // Revert to previous state if the update fails
      console.error('Failed to update event:', error);
      setEvents(previousEvents);
    }
  };

  const handleEventResize = async ({ event, start, end }) => {
    if (userRole === 'student') return;
    const updatedEvent = { ...event, start, end };
    const previousEvents = [...events];

    // Optimistically update the local state
    setEvents(events.map(evt => evt.id === event.id ? updatedEvent : evt));

    try {
      const eventDoc = doc(db, 'events', event.id);
      await updateDoc(eventDoc, {
        start: new Date(start),
        end: new Date(end),
      });
    } catch (error) {
      // Revert to previous state if the update fails
      console.error('Failed to update event:', error);
      setEvents(previousEvents);
    }
  };

  const messages = {
    allDay: 'All Day',
    previous: 'Back',
    next: 'Next',
    today: 'Today',
    month: 'Month',
    week: 'Week',
    day: 'Day',
    agenda: 'Agenda',
    date: 'Date',
    time: 'Time',
    event: 'Event',
    noEventsInRange: 'No events in this range.',
    showMore: total => `+${total} more`,
  };

  return (
    <div className="relative">
      <div className="w-full p-4 bg-white rounded-lg shadow-lg">
        {userRole !== 'student' ? (
          <DnDCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '600px' }}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            onEventDrop={handleEventDrop}
            onEventResize={handleEventResize}
            resizable
            selectable
            date={currentDate}
            onNavigate={handleNavigate}
            view={currentView}
            onView={handleViewChange}
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            messages={messages}
          />
        ) : (
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '600px' }}
            date={currentDate}
            onNavigate={handleNavigate}
            view={currentView}
            onView={handleViewChange}
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            messages={messages}
          />
        )}
      </div>
      {showModal && userRole !== 'student' && (
        <EventForm
          isEditing={isEditing}
          newEvent={newEvent}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          handleDelete={handleDelete}
          setShowModal={setShowModal}
          handleStaffChange={handleStaffChange}
          handleClassChange={handleClassChange}
          handleStudentChange={handleStudentChange}
        />
      )}
    </div>
  );
};

export default CalendarWrapper;
