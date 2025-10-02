"use client";

import React, { useState } from 'react';
import moment from 'moment';
import Select from 'react-select';
import { Button, ButtonGroup, Form, Alert } from 'react-bootstrap';
import BaseModal from '../modals/BaseModal.jsx';

const TutorAvailabilityForm = ({ isEditing, newAvailability, setNewAvailability, handleInputChange, handleSubmit, 
                            handleDelete, setShowModal}) => {

  const [error, setError] = useState('');

  const locationOptions = [
    { value: 'onsite', label: 'Onsite' },
    { value: 'remote', label: 'Remote' },
  ];

  const workTypeOptions = [
    { value: 'tutoring', label: 'Tutoring' },
    { value: 'tutoringOrWork', label: 'Tutoring Or Work' },
    { value: 'work', label: 'Work' }

  ];

  const validateDates = () => {
    const start = moment(newAvailability.start);
    const end = moment(newAvailability.end);
    if (end.isSameOrBefore(start)) {
      setError('End date must be after the start date.');
      return false;
    }
    setError('');
    return true;
  };

  const setHours = (hours) => {
    if (newAvailability.start) {
      const newEnd = moment(newAvailability.start).add(hours, 'hours');
      setNewAvailability({ ...newAvailability, end: newEnd.toISOString() });
    } else {
      setError("Invalid hours")
    }
  }
  const onSubmit = async (e) => {
    e.preventDefault();
    if (validateDates()) {
      handleSubmit(e);
    }

    // await fetch("/api/send-event", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     subject: "Math Tutoring - Year 10",
    //     start: "2025-09-17T14:00:00",
    //     end: "2025-09-17T15:00:00",
    //     attendees: ["mmei@kings.edu.au", "vpatel@kings.edu.au", "eqsu@kings.edu.au"],
    //   }),
    // });
  };

  const handleLocationChange = (selectedOption) => {
    setNewAvailability({ ...newAvailability, locationType: selectedOption.value });
  };

  const handleWorkTypeChange = async (selectedOption) => {
    setNewAvailability({ ...newAvailability, workType: selectedOption.value });
  };

  return (
    <BaseModal
      show={true}
      onHide={() => setShowModal(false)}
      title={isEditing ? 'Edit Availability' : 'Add Availability'}
      size="md"
      onSubmit={onSubmit}
      submitText={isEditing ? 'Save Changes' : 'Add Availability'}
      deleteButton={isEditing ? {
        text: "Delete",
        onClick: handleDelete,
        variant: "danger"
      } : null}
    >
      {error && <Alert variant="danger">{error}</Alert>}

      <Form.Group className="mb-3">
        <Form.Label htmlFor="start">Start Time</Form.Label>
        <Form.Control
          type="datetime-local"
          name="start"
          id="start"
          value={moment(newAvailability.start).format('YYYY-MM-DDTHH:mm')}
          onChange={handleInputChange}
          required
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label htmlFor="end">End Time</Form.Label>
        <Form.Control
          type="datetime-local"
          name="end"
          id="end"
          value={moment(newAvailability.end).format('YYYY-MM-DDTHH:mm')}
          onChange={handleInputChange}
          required
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Quick Time Selection</Form.Label>
        <div>
          <ButtonGroup>
            <Button variant="outline-primary" onClick={() => setHours(6)}>6hrs</Button>
            <Button variant="outline-secondary" onClick={() => setHours(3)}>3hrs</Button>
          </ButtonGroup>
        </div>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label htmlFor="workType">Work Type</Form.Label>
        <Select
          name="workType"
          options={workTypeOptions}
          value={workTypeOptions.find(option => option.value === newAvailability.workType)}
          onChange={handleWorkTypeChange}
          classNamePrefix="select"
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label htmlFor="locationType">Location Type</Form.Label>
        <Select
          name="locationType"
          options={locationOptions}
          value={locationOptions.find(option => option.value === newAvailability.locationType)}
          onChange={handleLocationChange}
          classNamePrefix="select"
          required
        />
      </Form.Group>
    </BaseModal>
  );
};

export default TutorAvailabilityForm;
