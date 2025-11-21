'use client';

import React from 'react';
import EventForm from '../forms/EventForm.jsx';

const EventDetailsModal = ({ event, onClose, events, setEvents }) => {
    return (
        <EventForm
            isEditing={true}
            newEvent={event}
            setNewEvent={() => {}} // Read-only, no updates
            eventToEdit={event}
            setShowModal={onClose}
            eventsData={{ events, setEvents }}
            readOnly={true}
        />
    );
};

export default EventDetailsModal;
