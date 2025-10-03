"use client";

import React, { useState } from 'react';
import moment from 'moment';
import Select from 'react-select';
import { Form, Button, Row, Col } from 'react-bootstrap';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@firebase/db';
import BaseModal from './BaseModal.jsx';

const EventDetailsModal = ({ event, handleClose, userEmail, userRole, events, setEvents }) => {
  const studentResponse = event.studentResponses?.find(response => response.email === userEmail);
  const [response, setResponse] = useState(studentResponse ? (studentResponse.response ? 'accepted' : 'declined') : '');
  const [workStatus, setWorkStatus] = useState(event.workStatus || 'notCompleted');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleResponseChange = (selectedOption) => {
    setResponse(selectedOption.value);
    setHasChanges(true);
  };

  const handleWorkStatusChange = (selectedOption) => {
    setWorkStatus(selectedOption.value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) {
      handleClose();
      return;
    }

    setIsSaving(true);
    try {
      const updateData = {};

      // Update student response if changed
      if (userRole === 'student' && event.minStudents > 0) {
        const isAccepted = response === 'accepted';
        const updatedStudentResponses = [
          ...(event.studentResponses || []).filter(resp => resp.email !== userEmail),
          { email: userEmail, response: isAccepted },
        ];
        updateData.studentResponses = updatedStudentResponses;
      }

      // Update work status if changed
      if (userRole === 'tutor' && workStatus !== event.workStatus) {
        updateData.workStatus = workStatus;
      }

      // Save to Firebase
      const eventDoc = doc(db, 'events', event.id);
      await updateDoc(eventDoc, updateData);

      // Update local state
      const updatedEvent = { ...event, ...updateData };
      setEvents(events.map(evt => (evt.id === event.id ? updatedEvent : evt)));

      handleClose();
    } catch (error) {
      console.error('Failed to save changes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const workStatusOptions = [
    { value: 'notCompleted', label: 'Not Completed' },
    { value: 'completed', label: 'Completed' },
    { value: 'notAttended', label: "Student Didn't Attend" },
  ];

  return (
    <BaseModal
      show={true}
      onHide={handleClose}
      title="Event Details"
      size="md"
      customFooter={
        <div className="w-100 d-flex justify-content-end gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          {hasChanges && (
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      }
    >
      <Form.Group className="mb-2">
        <Form.Label>Title</Form.Label>
        <Form.Control
          type="text"
          value={event.title}
          readOnly
          className="bg-light"
          size="sm"
        />
      </Form.Group>

      <Form.Group className="mb-2">
        <Form.Label>Description</Form.Label>
        <Form.Control
          as="textarea"
          rows={2}
          value={event.description}
          readOnly
          className="bg-light"
          size="sm"
        />
      </Form.Group>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-2">
            <Form.Label>Start Time</Form.Label>
            <Form.Control
              type="datetime-local"
              value={moment(event.start).format('YYYY-MM-DDTHH:mm')}
              readOnly
              className="bg-light"
              size="sm"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-2">
            <Form.Label>End Time</Form.Label>
            <Form.Control
              type="datetime-local"
              value={moment(event.end).format('YYYY-MM-DDTHH:mm')}
              readOnly
              className="bg-light"
              size="sm"
            />
          </Form.Group>
        </Col>
      </Row>

      <Form.Group className="mb-2">
        <Form.Label>Staff</Form.Label>
        <Select
          isMulti
          value={event.staff}
          isDisabled
          className="basic-multi-select"
          classNamePrefix="select"
        />
      </Form.Group>

      <Form.Group className="mb-2">
        <Form.Label>Classes</Form.Label>
        <Select
          isMulti
          value={event.classes}
          isDisabled
          className="basic-multi-select"
          classNamePrefix="select"
        />
      </Form.Group>

      <Form.Group className="mb-2">
        <Form.Label>Students</Form.Label>
        <Select
          isMulti
          value={event.students}
          isDisabled
          className="basic-multi-select"
          classNamePrefix="select"
        />
      </Form.Group>

      {userRole === 'student' && event.minStudents > 0 && (
        <Form.Group className="mb-2">
          <Form.Label>Your Response</Form.Label>
          <Select
            name="userResponse"
            options={[
              { value: 'accepted', label: 'Accept' },
              { value: 'declined', label: 'Decline' },
            ]}
            value={response ? { value: response, label: response.charAt(0).toUpperCase() + response.slice(1) } : null}
            onChange={handleResponseChange}
            className="basic-single-select"
            classNamePrefix="select"
          />
        </Form.Group>
      )}

      {userRole === 'tutor' && (
        <Form.Group className="mb-2">
          <Form.Label>Work Status</Form.Label>
          <Select
            name="workStatus"
            options={workStatusOptions}
            value={workStatusOptions.find(option => option.value === workStatus)}
            onChange={handleWorkStatusChange}
            classNamePrefix="select"
          />
        </Form.Group>
      )}
    </BaseModal>
  );
};

export default EventDetailsModal;
