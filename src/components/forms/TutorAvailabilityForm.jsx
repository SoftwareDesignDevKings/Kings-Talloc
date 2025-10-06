"use client";

import React, { useState } from 'react';
import moment from 'moment';
import Select from 'react-select';
import { Button, ButtonGroup, Form, Alert, Badge, Card } from 'react-bootstrap';
import BaseModal from '../modals/BaseModal.jsx';
import { MdAccessTime, MdLocationOn, MdWork } from '@/components/icons';

const TutorAvailabilityForm = ({ isEditing, newAvailability, setNewAvailability, handleInputChange, handleSubmit, 
                            handleDelete, setShowModal}) => {

  const [error, setError] = useState('');

  const locationOptions = [
    { value: 'onsite', label: 'Onsite' },
    { value: 'remote', label: 'Remote' },
  ];

  const workTypeOptions = [
    { value: 'tutoring', label: 'Tutoring' },
    { value: 'coaching', label: 'Coaching' },
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

  const getWorkTypeBadge = () => {
    const workType = newAvailability.workType;
    const badges = {
      tutoring: <Badge bg="primary" className="me-1">Tutoring</Badge>,
      coaching: <Badge bg="info" className="me-1">Coaching</Badge>,
      tutoringOrWork: <Badge bg="success" className="me-1">Tutoring/Work</Badge>,
      work: <Badge bg="secondary" className="me-1">Work</Badge>
    };
    return badges[workType] || null;
  };

  const getLocationBadge = () => {
    const location = newAvailability.locationType;
    if (location === 'onsite') return <Badge bg="success">🏫 Onsite</Badge>;
    if (location === 'remote') return <Badge bg="info">💻 Remote</Badge>;
    return null;
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
      {error && <Alert variant="danger" className="mb-3 py-2">{error}</Alert>}

      {/* Summary badges */}
      {(newAvailability.workType || newAvailability.locationType) && (
        <div className="mb-3 pb-2 border-bottom">
          {getWorkTypeBadge()}
          {getLocationBadge()}
        </div>
      )}

      {/* Time Selection Card */}
      <Card className="mb-3 border-primary" style={{borderWidth: '2px'}}>
        <Card.Body className="p-3">
          <div className="d-flex align-items-center mb-2">
            <MdAccessTime className="me-2 text-primary" size={18} />
            <small className="text-muted fw-semibold">Time Period</small>
          </div>

          <Form.Group className="mb-2">
            <Form.Label htmlFor="start" className="small text-muted mb-1">Start Time</Form.Label>
            <Form.Control
              type="datetime-local"
              name="start"
              id="start"
              value={moment(newAvailability.start).format('YYYY-MM-DDTHH:mm')}
              onChange={handleInputChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-2">
            <Form.Label htmlFor="end" className="small text-muted mb-1">End Time</Form.Label>
            <Form.Control
              type="datetime-local"
              name="end"
              id="end"
              value={moment(newAvailability.end).format('YYYY-MM-DDTHH:mm')}
              onChange={handleInputChange}
              required
            />
          </Form.Group>

          <div className="d-flex gap-2 align-items-center">
            <small className="text-muted">Quick:</small>
            <ButtonGroup size="sm">
              <Button variant="outline-primary" onClick={() => setHours(6)}>6hrs</Button>
              <Button variant="outline-secondary" onClick={() => setHours(3)}>3hrs</Button>
            </ButtonGroup>
          </div>
        </Card.Body>
      </Card>

      {/* Work Type & Location */}
      <div className="row g-2">
        <div className="col-6">
          <Card className="h-100 border-info" style={{borderWidth: '2px'}}>
            <Card.Body className="p-2">
              <div className="d-flex align-items-center mb-2">
                <MdWork className="me-1 text-info" size={16} />
                <small className="text-muted fw-semibold">Type</small>
              </div>
              <Select
                name="workType"
                options={workTypeOptions}
                value={workTypeOptions.find(option => option.value === newAvailability.workType)}
                onChange={handleWorkTypeChange}
                classNamePrefix="select"
                placeholder="Select type..."
              />
            </Card.Body>
          </Card>
        </div>
        <div className="col-6">
          <Card className="h-100 border-success" style={{borderWidth: '2px'}}>
            <Card.Body className="p-2">
              <div className="d-flex align-items-center mb-2">
                <MdLocationOn className="me-1 text-success" size={16} />
                <small className="text-muted fw-semibold">Location</small>
              </div>
              <Select
                name="locationType"
                options={locationOptions}
                value={locationOptions.find(option => option.value === newAvailability.locationType)}
                onChange={handleLocationChange}
                classNamePrefix="select"
                placeholder="Select location..."
                required
              />
            </Card.Body>
          </Card>
        </div>
      </div>
    </BaseModal>
  );
};

export default TutorAvailabilityForm;
