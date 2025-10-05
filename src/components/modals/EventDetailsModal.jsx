"use client";

import React, { useState } from 'react';
import moment from 'moment';
import Select from 'react-select';
import { Form, Button, Row, Col, Badge, Card, Offcanvas } from 'react-bootstrap';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firestore/clientFirestore.js';
import { MdEventNote, MdPeople, MdSchool, MdAccessTime, MdNoteAlt, MdMenuBook, MdFlag, MdEdit, FaChalkboardTeacher, FaUserGraduate } from '@/components/icons';

const EventDetailsModal = ({ event, handleClose, userEmail, userRole, events, setEvents }) => {
  console.log('EventDetailsModal - event:', event);
  console.log('createdByStudent:', event.createdByStudent);
  console.log('subject:', event.subject);
  console.log('preference:', event.preference);

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
    <Offcanvas show={true} onHide={handleClose} placement="end" backdrop={true} className="tw-w-[480px] tw-max-w-[90vw]">
      <Offcanvas.Header closeButton className="bg-light border-bottom">
        <Offcanvas.Title className="fw-semibold">Event Details</Offcanvas.Title>
      </Offcanvas.Header>

      <Offcanvas.Body className="p-3 d-flex flex-column">
          {/* Event Information Card */}
          <Card className="mb-3 border-0 shadow-sm">
            <Card.Header className="bg-secondary text-white py-2">
              <h6 className="mb-0 d-flex align-items-center gap-2">
                <MdEventNote className="fs-5" /> Event Information
              </h6>
            </Card.Header>
            <Card.Body className="p-3">
              <div className="mb-3">
                <small className="text-muted d-block mb-1">Title</small>
                <h5 className="mb-0">{event.title}</h5>
              </div>

              {event.description && (
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Description</small>
                  <p className="mb-0">{event.description}</p>
                </div>
              )}

              <Row>
                <Col md={6}>
                  <small className="text-muted d-block mb-1 d-flex align-items-center gap-1">
                    <MdAccessTime /> Start Time
                  </small>
                  <div className="fw-medium">{moment(event.start).format('MMM D, YYYY h:mm A')}</div>
                </Col>
                <Col md={6}>
                  <small className="text-muted d-block mb-1 d-flex align-items-center gap-1">
                    <MdAccessTime /> End Time
                  </small>
                  <div className="fw-medium">{moment(event.end).format('MMM D, YYYY h:mm A')}</div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Participants Card */}
          <Card className="mb-3 border-0 shadow-sm">
            <Card.Header className="bg-success text-white py-2">
              <h6 className="mb-0 d-flex align-items-center gap-2">
                <MdPeople className="fs-5" /> Participants
              </h6>
            </Card.Header>
            <Card.Body className="p-3">
              {event.staff && event.staff.length > 0 && (
                <div className="mb-3">
                  <small className="text-muted d-block mb-2 d-flex align-items-center gap-1">
                    <FaChalkboardTeacher /> Staff
                  </small>
                  <div className="d-flex flex-wrap gap-1">
                    {event.staff.map((staff, idx) => (
                      <Badge key={idx} bg="secondary" className="fw-normal">
                        {staff.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {event.classes && event.classes.length > 0 && (
                <div className="mb-3">
                  <small className="text-muted d-block mb-2 d-flex align-items-center gap-1">
                    <MdSchool /> Classes
                  </small>
                  <div className="d-flex flex-wrap gap-1">
                    {event.classes.map((cls, idx) => (
                      <Badge key={idx} bg="success" className="fw-normal">
                        {cls.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {event.students && event.students.length > 0 && (
                <div>
                  <small className="text-muted d-block mb-2 d-flex align-items-center gap-1">
                    <FaUserGraduate /> Students
                  </small>
                  <div className="d-flex flex-wrap gap-1">
                    {event.students.map((student, idx) => (
                      <Badge key={idx} bg="primary" className="fw-normal">
                        {student.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Student Request Info Card */}
          {(event.createdByStudent || event.isStudentRequest) && (event.subject || event.preference) && (
            <Card className="mb-3 border-0 shadow-sm">
              <Card.Header className="bg-secondary text-white py-2">
                <h6 className="mb-0 d-flex align-items-center gap-2">
                  <MdNoteAlt className="fs-5" /> Student Request Details
                </h6>
              </Card.Header>
              <Card.Body className="p-3">
                {event.subject && (
                  <div className="mb-2">
                    <small className="text-muted d-block mb-1 d-flex align-items-center gap-1">
                      <MdMenuBook /> Subject
                    </small>
                    <Badge bg="dark" className="fw-normal">
                      {typeof event.subject === 'object' ? event.subject.label : event.subject}
                    </Badge>
                  </div>
                )}

                {event.preference && (
                  <div>
                    <small className="text-muted d-block mb-1 d-flex align-items-center gap-1">
                      <MdFlag /> Preference
                    </small>
                    <Badge bg="primary" className="fw-normal">
                      {event.preference}
                    </Badge>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}

          {/* Actions Card */}
          {(userRole === 'student' && event.minStudents > 0) || userRole === 'tutor' ? (
            <Card className="mb-0 border-0 shadow-sm">
              <Card.Header className="bg-info text-white py-2">
                <h6 className="mb-0 d-flex align-items-center gap-2">
                  <MdEdit className="fs-5" /> Your Response
                </h6>
              </Card.Header>
              <Card.Body className="p-3">
                {userRole === 'student' && event.minStudents > 0 && (
                  <Form.Group>
                    <Form.Label className="small text-muted mb-1">Your Attendance</Form.Label>
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
                  <Form.Group>
                    <Form.Label className="small text-muted mb-1">Work Status</Form.Label>
                    <Select
                      name="workStatus"
                      options={workStatusOptions}
                      value={workStatusOptions.find(option => option.value === workStatus)}
                      onChange={handleWorkStatusChange}
                      classNamePrefix="select"
                    />
                  </Form.Group>
                )}
              </Card.Body>
            </Card>
          ) : null}

        {/* Footer */}
        <div className="mt-auto border-top p-3 bg-light">
          <div className="d-flex justify-content-end gap-2">
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
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  );
};

export default EventDetailsModal;
