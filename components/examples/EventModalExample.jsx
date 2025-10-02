"use client";

import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import EventModal from '../modals/EventModal.jsx';

/**
 * Example component showing how to use the unified EventModal
 * for different user roles
 */
const EventModalExample = ({ eventsData, userEmail = 'student@example.com' }) => {
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({});

  const openModalForRole = (role, eventToEdit = null) => {
    setModalConfig({
      userRole: role,
      userEmail: userEmail,
      isEditing: !!eventToEdit,
      eventToEdit,
    });
    setShowModal(true);
  };

  return (
    <div className="p-4">
      <h3>Unified EventModal Examples</h3>

      <div className="d-flex gap-2 mb-3">
        <Button
          variant="primary"
          onClick={() => openModalForRole('student')}
        >
          Student: Request Tutoring
        </Button>

        <Button
          variant="success"
          onClick={() => openModalForRole('teacher')}
        >
          Teacher: Create Event
        </Button>

        <Button
          variant="warning"
          onClick={() => openModalForRole('tutor')}
        >
          Tutor: Add Availability
        </Button>
      </div>

      <EventModal
        show={showModal}
        onHide={() => setShowModal(false)}
        isEditing={modalConfig.isEditing}
        eventToEdit={modalConfig.eventToEdit}
        userRole={modalConfig.userRole}
        userEmail={modalConfig.userEmail}
        eventsData={eventsData}
        initialEventData={{
          start: new Date(),
          end: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
        }}
      />
    </div>
  );
};

export default EventModalExample;