import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import Select from 'react-select';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import EventForm from './EventForm';
import AvailabilityForm from './AvailabilityForm';
import EventDetailsModal from './EventDetailsModal';
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

const CalendarWrapper = ({ userRole, userEmail }) => {
  const [events, setEvents] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState(Views.MONTH);
  const [showModal, setShowModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', start: '', end: '', description: '', confirmationRequired: false, staff: [], classes: [], students: [], tutorResponses: [], studentResponses: [], minStudents: 0 });
  const [newAvailability, setNewAvailability] = useState({ title: 'Availability', start: '', end: '', tutor: userEmail });
  const [isEditing, setIsEditing] = useState(false);
  const [eventToEdit, setEventToEdit] = useState(null);
  const [tutors, setTutors] = useState([]);
  const [selectedTutors, setSelectedTutors] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const q = query(collection(db, 'events'));
      const unsubscribe = onSnapshot(q, async (querySnapshot) => {
        const eventsFromDb = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          start: doc.data().start.toDate(),
          end: doc.data().end.toDate(),
        }));

        let filteredEvents = [];
        if (userRole === 'teacher') {
          filteredEvents = eventsFromDb;
        } else if (userRole === 'tutor') {
          filteredEvents = eventsFromDb.filter(event => event.staff.some(staff => staff.value === userEmail));
        } else if (userRole === 'student') {
          const classQuerySnapshot = await getDocs(collection(db, 'classes'));
          const studentClasses = classQuerySnapshot.docs
            .map(doc => doc.data())
            .filter(cls => cls.students.some(student => student.email === userEmail))
            .map(cls => cls.name);

          filteredEvents = eventsFromDb.filter(event => 
            event.students.some(student => student.value === userEmail) ||
            event.classes.some(cls => studentClasses.includes(cls.label))
          );
        }

        setEvents(filteredEvents);
      });

      return () => unsubscribe();
    };

    const fetchAvailabilities = async () => {
      const q = query(collection(db, 'availabilities'));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const availabilitiesFromDb = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          start: doc.data().start.toDate(),
          end: doc.data().end.toDate(),
        }));

        setAvailabilities(availabilitiesFromDb);
      });

      return () => unsubscribe();
    };

    const fetchTutors = async () => {
      const querySnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'tutor')));
      const tutorsList = querySnapshot.docs.map(doc => ({
        value: doc.data().email,
        label: doc.data().name || doc.data().email,
      }));
      setTutors(tutorsList);
    };

    fetchEvents();
    fetchAvailabilities();
    fetchTutors();
  }, [userRole, userEmail]);

  const handleSelectSlot = (slotInfo) => {
    if (userRole === 'student') return;

    const start = slotInfo.start;
    const end = slotInfo.end;

    if (userRole === 'tutor') {
      setNewAvailability({ title: 'Availability', start, end, tutor: userEmail });
      setIsEditing(false);
      setShowAvailabilityModal(true);
    } else {
      setNewEvent({ title: '', start, end, description: '', confirmationRequired: false, staff: [], classes: [], students: [], tutorResponses: [], studentResponses: [], minStudents: 0 });
      setIsEditing(false);
      setShowModal(true);
    }
  };

  const handleSelectEvent = (event) => {
    if (event.tutor) {
      // This is an availability
      if (userRole === 'tutor' && event.tutor === userEmail) {
        setNewAvailability(event);
        setIsEditing(true);
        setEventToEdit(event);
        setShowAvailabilityModal(true);
      } else {
        setEventToEdit(event);
        setShowDetailsModal(true);
      }
    } else {
      // This is a regular event
      if (userRole === 'teacher') {
        setNewEvent(event);
        setIsEditing(true);
        setEventToEdit(event);
        setShowModal(true);
      } else {
        setEventToEdit(event);
        setShowDetailsModal(true);
      }
    }
  };

  const handleNavigate = (newDate) => {
    setCurrentDate(newDate);
  };

  const handleViewChange = (newView) => {
    setCurrentView(newView);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setNewEvent({ ...newEvent, [name]: val });
  };

  const handleAvailabilityChange = (e) => {
    const { name, value } = e.target;
    setNewAvailability({ ...newAvailability, [name]: value });
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

  const handleTutorSelectChange = (selectedOptions) => {
    setSelectedTutors(selectedOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEditing) {
      const eventDoc = doc(db, 'events', eventToEdit.id);
      await updateDoc(eventDoc, {
        title: newEvent.title,
        start: new Date(newEvent.start),
        end: new Date(newEvent.end),
        description: newEvent.description,
        confirmationRequired: newEvent.confirmationRequired,
        staff: newEvent.staff,
        classes: newEvent.classes,
        students: newEvent.students,
        tutorResponses: newEvent.tutorResponses,
        studentResponses: newEvent.studentResponses,
        minStudents: newEvent.minStudents,
      });
      setEvents(events.map(event => event.id === eventToEdit.id ? { ...newEvent, id: eventToEdit.id } : event));
    } else {
      const docRef = await addDoc(collection(db, 'events'), {
        title: newEvent.title,
        start: new Date(newEvent.start),
        end: new Date(newEvent.end),
        description: newEvent.description,
        confirmationRequired: newEvent.confirmationRequired,
        staff: newEvent.staff,
        classes: newEvent.classes,
        students: newEvent.students,
        tutorResponses: [],
        studentResponses: [],
        minStudents: newEvent.minStudents,
      });
      setEvents([...events, { ...newEvent, id: docRef.id }]);
    }
    setShowModal(false);
  };

  const handleAvailabilitySubmit = async (e) => {
    e.preventDefault();
    if (isEditing) {
      const availabilityDoc = doc(db, 'availabilities', eventToEdit.id);
      await updateDoc(availabilityDoc, {
        title: newAvailability.title,
        start: new Date(newAvailability.start),
        end: new Date(newAvailability.end),
        tutor: newAvailability.tutor,
      });
      setAvailabilities(availabilities.map(availability => availability.id === eventToEdit.id ? { ...newAvailability, id: eventToEdit.id } : availability));
    } else {
      const docRef = await addDoc(collection(db, 'availabilities'), {
        title: newAvailability.title,
        start: new Date(newAvailability.start),
        end: new Date(newAvailability.end),
        tutor: newAvailability.tutor,
      });
      setAvailabilities([...availabilities, { ...newAvailability, id: docRef.id }]);
    }
    setShowAvailabilityModal(false);
  };

  const handleDelete = async () => {
    if (eventToEdit && eventToEdit.id) {
      const collectionName = eventToEdit.tutor ? 'availabilities' : 'events';
      await deleteDoc(doc(db, collectionName, eventToEdit.id));
      if (collectionName === 'availabilities') {
        setAvailabilities(availabilities.filter(availability => availability.id !== eventToEdit.id));
      } else {
        setEvents(events.filter(event => event.id !== eventToEdit.id));
      }
    }
    setShowModal(false);
    setShowAvailabilityModal(false);
  };

  const handleEventDrop = async ({ event, start, end }) => {
    const isAvailability = !!event.tutor;

    if (userRole === 'student' || (userRole === 'tutor' && !isAvailability)) return;

    const duration = (event.end - event.start);
    const updatedEnd = new Date(start.getTime() + duration);

    const updatedEvent = { ...event, start, end: updatedEnd };
    const previousEvents = [...events];
    const previousAvailabilities = [...availabilities];

    if (isAvailability) {
      setAvailabilities(availabilities.map(avail => avail.id === event.id ? updatedEvent : avail));
    } else {
      setEvents(events.map(evt => evt.id === event.id ? updatedEvent : evt));
    }

    try {
      const eventDoc = doc(db, isAvailability ? 'availabilities' : 'events', event.id);
      await updateDoc(eventDoc, {
        start: new Date(start),
        end: updatedEnd,
      });
    } catch (error) {
      // Revert to previous state if the update fails
      console.error('Failed to update event:', error);
      if (isAvailability) {
        setAvailabilities(previousAvailabilities);
      } else {
        setEvents(previousEvents);
      }
    }
  };

  const handleEventResize = async ({ event, start, end }) => {
    const isAvailability = !!event.tutor;

    if (userRole === 'student' || (userRole === 'tutor' && !isAvailability)) return;

    const updatedEvent = { ...event, start, end };
    const previousEvents = [...events];
    const previousAvailabilities = [...availabilities];

    if (isAvailability) {
      setAvailabilities(availabilities.map(avail => avail.id === event.id ? updatedEvent : avail));
    } else {
      setEvents(events.map(evt => evt.id === event.id ? updatedEvent : evt));
    }

    try {
      const eventDoc = doc(db, isAvailability ? 'availabilities' : 'events', event.id);
      await updateDoc(eventDoc, {
        start: new Date(start),
        end: new Date(end),
      });
    } catch (error) {
      // Revert to previous state if the update fails
      console.error('Failed to update event:', error);
      if (isAvailability) {
        setAvailabilities(previousAvailabilities);
      } else {
        setEvents(previousEvents);
      }
    }
  };

  const handleConfirmation = async (event, confirmed) => {
    if (userRole === 'tutor') {
      const updatedTutorResponses = [
        ...event.tutorResponses.filter(response => response.email !== userEmail),
        { email: userEmail, response: confirmed },
      ];
      const updatedEvent = { ...event, tutorResponses: updatedTutorResponses };
      const eventDoc = doc(db, 'events', event.id);
      await updateDoc(eventDoc, {
        tutorResponses: updatedTutorResponses,
      });
      setEvents(events.map(evt => evt.id === event.id ? updatedEvent : evt));
    } else if (userRole === 'student' && event.minStudents > 0) {
      const updatedStudentResponses = [
        ...event.studentResponses.filter(response => response.email !== userEmail),
        { email: userEmail, response: confirmed },
      ];
      const updatedEvent = { ...event, studentResponses: updatedStudentResponses };
      const eventDoc = doc(db, 'events', event.id);
      await updateDoc(eventDoc, {
        studentResponses: updatedStudentResponses,
      });
      setEvents(events.map(evt => evt.id === event.id ? updatedEvent : evt));
    }
    setShowDetailsModal(false);
  };

  const eventStyleGetter = (event) => {
    const isAvailability = !!event.tutor;
    const tutorResponse = event.tutorResponses?.find(response => response.email === userEmail);
    const studentResponse = event.studentResponses?.find(response => response.email === userEmail);
    const isDeclined = event.tutorResponses?.some(response => response.email === userEmail && response.response === false) || event.studentResponses?.some(response => response.email === userEmail && response.response === false);
    const needsConfirmation = userRole === 'tutor' && event.confirmationRequired && !tutorResponse;
    const needsStudentConfirmation = userRole === 'student' && event.minStudents > 0 && !studentResponse;

    const style = {
      backgroundColor: isAvailability ? 'lightgreen' : (isDeclined ? 'grey' : (needsConfirmation || needsStudentConfirmation ? 'red' : 'lightblue')),
      borderColor: isAvailability ? 'green' : (isDeclined ? 'black' : (needsConfirmation || needsStudentConfirmation ? 'red' : 'blue')),
      color: 'black',
    };

    return {
      style: style
    };
  };

  const customDayPropGetter = (date) => {
    const isAvailability = availabilities.some(
      (availability) =>
        selectedTutors.some(tutor => tutor.value === availability.tutor) &&
        moment(date).isBetween(availability.start, availability.end, undefined, '[)')
    );

    if (isAvailability) {
      return {
        style: {
          backgroundColor: 'lightgreen',
        },
      };
    }

    return {};
  };

  const customSlotPropGetter = (date) => {
    const isAvailability = availabilities.some(
      (availability) =>
        selectedTutors.some(tutor => tutor.value === availability.tutor) &&
        moment(date).isBetween(availability.start, availability.end, undefined, '[)')
    );

    if (isAvailability) {
      return {
        style: {
          backgroundColor: 'lightgreen',
        },
      };
    }

    return {};
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
      <div className="w-full p-4 bg-white rounded-lg shadow-lg mb-4">
        <Select
          isMulti
          name="tutors"
          options={tutors}
          value={selectedTutors}
          onChange={handleTutorSelectChange}
          className="basic-multi-select"
          classNamePrefix="select"
          placeholder="Select tutors to view availabilities"
        />
      </div>
      <div className="w-full p-4 bg-white rounded-lg shadow-lg">
        <DnDCalendar
          localizer={localizer}
          events={userRole === 'tutor' ? [...events, ...availabilities.filter(avail => avail.tutor === userEmail)] : events}
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
          eventPropGetter={eventStyleGetter}
          dayPropGetter={customDayPropGetter}
          slotPropGetter={customSlotPropGetter}
        />
      </div>
      {showModal && userRole === 'teacher' && (
        <EventForm
          isEditing={isEditing}
          newEvent={newEvent}
          setNewEvent={setNewEvent} // Pass setNewEvent to EventForm
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          handleDelete={handleDelete}
          setShowModal={setShowModal}
          handleStaffChange={handleStaffChange}
          handleClassChange={handleClassChange}
          handleStudentChange={handleStudentChange}
        />
      )}
      {showAvailabilityModal && userRole === 'tutor' && (
        <AvailabilityForm
          isEditing={isEditing}
          newAvailability={newAvailability}
          setNewAvailability={setNewAvailability} // Pass setNewAvailability to AvailabilityForm
          handleInputChange={handleAvailabilityChange}
          handleSubmit={handleAvailabilitySubmit}
          handleDelete={handleDelete}
          setShowModal={setShowAvailabilityModal}
        />
      )}
      {showDetailsModal && (
        <EventDetailsModal
          event={eventToEdit}
          handleClose={() => setShowDetailsModal(false)}
          handleConfirmation={handleConfirmation}
          userEmail={userEmail}
          userRole={userRole}
        />
      )}
    </div>
  );
};

export default CalendarWrapper;
