'use client';

import React from 'react';
import EventForm from '../forms/EventForm.jsx';

const EventDetailsModal = ({ event, onClose, events, setEvents, userRole }) => {
    return (
        <EventForm
            isEditing={true}
            newEvent={event}
            setNewEvent={() => {}} // Read-only, no updates
            eventToEdit={event}
            setShowModal={onClose}
            eventsData={{ events, setEvents }}
            readOnly={userRole === 'student'}
            userRole={userRole}
        />
    );
};

export default EventDetailsModal;
