"use client";

import React, { useState } from 'react';
import moment from 'moment';
import Select, { components } from 'react-select';
import { Form, Row, Col, Alert, Badge, Accordion } from 'react-bootstrap';
import BaseModal from '../modals/BaseModal.jsx';
import { useEventForm } from '@/hooks/forms/useEventForm';
import { useEventFormData } from '@/hooks/forms/useEventFormData';
import { useEventOperations } from '@/hooks/calendar/useEventOperations';
import { MdEventNote, MdPeople, MdSettings, MdNoteAlt, MdAccessTime, MdSchool, MdMenuBook, MdFlag, FaChalkboardTeacher, FaUserGraduate } from '@/components/icons';

const EventForm = ({
  isEditing,
  newEvent,
  setNewEvent,
  eventToEdit,
  setShowModal,
  eventsData,
  handleClassChange
}) => {
  const [selectedStaff, setSelectedStaff] = useState(newEvent.staff || []);
  const [selectedClasses, setSelectedClasses] = useState(newEvent.classes || []);
  const [selectedStudents, setSelectedStudents] = useState(newEvent.students || []);
  const [error, setError] = useState('');

  // Use specialized hooks
  const eventForm = useEventForm(eventsData);
  const { handleDeleteEvent } = useEventOperations(eventsData);

  // Fetch form data using custom hook
  const { staffOptions, classOptions, studentOptions } = useEventFormData(newEvent);

  // Get handlers from the hook
  const handleInputChange = eventForm.handleInputChange(newEvent, setNewEvent);
  const handleStaffChange = eventForm.handleStaffChange(newEvent, setNewEvent);
  const handleStudentChange = eventForm.handleStudentChange(newEvent, setNewEvent);

  const handleStaffSelectChange = (selectedOptions) => {
    setSelectedStaff(selectedOptions);
    handleStaffChange(selectedOptions);
  };

  const handleClassSelectChange = (selectedOptions) => {
    setSelectedClasses(selectedOptions);
    handleClassChange(selectedOptions);
  };

  const handleStudentSelectChange = (selectedOptions) => {
    setSelectedStudents(selectedOptions);
    handleStudentChange(selectedOptions);
  };

  const handleMinStudentsChange = (e) => {
    setNewEvent({ ...newEvent, minStudents: parseInt(e.target.value, 10) });
  };

  const handleApprovalChange = (selectedOption) => {
    const approvalStatus = selectedOption.value;
    setNewEvent({ ...newEvent, approvalStatus });
  };

  const validateDates = () => {
    const start = moment(newEvent.start);
    const end = moment(newEvent.end);
    if (end.isSameOrBefore(start)) {
      setError('End date must be after the start date.');
      return false;
    }
    setError('');
    return true;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (validateDates()) {
      eventForm.handleSubmit(newEvent, isEditing, eventToEdit, setShowModal)(e);
    }
  };

  const handleDelete = () => {
    handleDeleteEvent(eventToEdit, { setShowTeacherModal: setShowModal, setShowStudentModal: () => {}, setShowAvailabilityModal: () => {} });
    setShowModal(false);
  };

  const approvalOptions = [
    { value: 'approved', label: 'Approve' },
    { value: 'denied', label: 'Deny' },
  ];

  const workStatusOptions = [
    { value: 'notCompleted', label: 'Not Completed' },
    { value: 'completed', label: 'Completed' },
    { value: 'notAttended', label: "Student Didn't Attend" },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'onsite':
        return '🏫';
      case 'remote':
        return '💻';
      case 'unavailable':
        return '❌';
      default:
        return '❔';
    }
  };

  const customOption = (props) => {
    const { data } = props;
    return (
      <components.Option {...props}>
        <span>{getStatusIcon(data.status)}</span> {data.label}
      </components.Option>
    );
  };

  const customSingleValue = (props) => {
    const { data } = props;
    return (
      <components.SingleValue {...props}>
        <span>{getStatusIcon(data.status)}</span> {data.label}
      </components.SingleValue>
    );
  };

  return (
    <BaseModal
        show={true}
        onHide={() => setShowModal(false)}
        title={isEditing ? 'Edit Event' : 'Add New Event'}
        size="lg"
        onSubmit={onSubmit}
        submitText={isEditing ? 'Save Changes' : 'Add Event'}
        deleteButton={isEditing ? {
          text: "Delete",
          onClick: handleDelete,
          variant: "danger"
        } : null}
      >
        {error && <Alert variant="danger">{error}</Alert>}

        <Accordion defaultActiveKey={['0']} alwaysOpen>
          {/* Event Details Section */}
          <Accordion.Item eventKey="0">
            <Accordion.Header>
              <MdEventNote className="me-2" /> Event Details
            </Accordion.Header>
            <Accordion.Body>
              <Form.Group className="mb-3">
                <Form.Label htmlFor="title" className="small text-muted mb-1">Title</Form.Label>
                <Form.Control
                  type="text"
                  name="title"
                  id="title"
                  value={newEvent.title}
                  onChange={handleInputChange}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label htmlFor="description" className="small text-muted mb-1">Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="description"
                  id="description"
                  value={newEvent.description}
                  onChange={handleInputChange}
                />
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label htmlFor="start" className="small text-muted mb-1 d-flex align-items-center gap-1">
                      <MdAccessTime /> Start Time
                    </Form.Label>
                    <Form.Control
                      type="datetime-local"
                      name="start"
                      id="start"
                      value={moment(newEvent.start).format('YYYY-MM-DDTHH:mm')}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-0">
                    <Form.Label htmlFor="end" className="small text-muted mb-1 d-flex align-items-center gap-1">
                      <MdAccessTime /> End Time
                    </Form.Label>
                    <Form.Control
                      type="datetime-local"
                      name="end"
                      id="end"
                      value={moment(newEvent.end).format('YYYY-MM-DDTHH:mm')}
                      onChange={handleInputChange}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Accordion.Body>
          </Accordion.Item>

          {/* Participants Section */}
          <Accordion.Item eventKey="1">
            <Accordion.Header>
              <MdPeople className="me-2" /> Participants
            </Accordion.Header>
            <Accordion.Body>
              <Form.Group className="mb-3">
                <Form.Label htmlFor="staff" className="small text-muted mb-1 d-flex align-items-center gap-1">
                  <FaChalkboardTeacher /> Assign Tutor
                </Form.Label>
                <Select
                  isMulti
                  name="tutor"
                  options={staffOptions}
                  value={selectedStaff}
                  onChange={handleStaffSelectChange}
                  classNamePrefix="select"
                  components={{ Option: customOption, SingleValue: customSingleValue }}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label htmlFor="classes" className="small text-muted mb-1 d-flex align-items-center gap-1">
                  <MdSchool /> Assign Classes
                </Form.Label>
                <Select
                  isMulti
                  name="classes"
                  options={classOptions}
                  value={selectedClasses}
                  onChange={handleClassSelectChange}
                  classNamePrefix="select"
                />
              </Form.Group>

              <Form.Group className="mb-0">
                <Form.Label htmlFor="students" className="small text-muted mb-1 d-flex align-items-center gap-1">
                  <FaUserGraduate /> Assign Students
                </Form.Label>
                <Select
                  isMulti
                  name="students"
                  options={studentOptions}
                  value={selectedStudents}
                  onChange={handleStudentSelectChange}
                  classNamePrefix="select"
                />
              </Form.Group>
            </Accordion.Body>
          </Accordion.Item>

          {/* Settings & Status Section */}
          <Accordion.Item eventKey="2">
            <Accordion.Header>
              <MdSettings className="me-2" /> Settings & Status
            </Accordion.Header>
            <Accordion.Body>
              <Form.Group className="mb-3">
                <Form.Label htmlFor="minStudents" className="small text-muted mb-1">Minimum Students Required</Form.Label>
                <Form.Control
                  type="number"
                  name="minStudents"
                  id="minStudents"
                  value={newEvent.minStudents || 0}
                  onChange={handleMinStudentsChange}
                />
              </Form.Group>

              {newEvent.minStudents > 0 && (
                <div className="mb-3">
                  <small className="text-muted d-block mb-2">Student Responses</small>
                  {newEvent.studentResponses && newEvent.studentResponses.length > 0 ? (
                    <div className="d-flex flex-wrap gap-1">
                      {newEvent.studentResponses.map((response, index) => (
                        <Badge
                          key={index}
                          bg={response.response ? 'success' : 'danger'}
                          className="fw-normal"
                        >
                          {response.email}: {response.response ? 'Accepted' : 'Declined'}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted mb-0 small fst-italic">No responses yet</p>
                  )}
                </div>
              )}

              <Form.Group className="mb-0">
                <Form.Label htmlFor="workStatus" className="small text-muted mb-1">Work Status</Form.Label>
                <Select
                  name="workStatus"
                  options={workStatusOptions}
                  onChange={(selectedOption) =>
                    setNewEvent({ ...newEvent, workStatus: selectedOption.value })
                  }
                  classNamePrefix="select"
                  defaultValue={workStatusOptions.find(
                    option => option.value === (newEvent.workStatus || 'notCompleted')
                  )}
                />
              </Form.Group>
            </Accordion.Body>
          </Accordion.Item>

          {/* Student Request Section */}
          {newEvent.createdByStudent && (
            <Accordion.Item eventKey="3">
              <Accordion.Header>
                <MdNoteAlt className="me-2" /> Student Request
              </Accordion.Header>
              <Accordion.Body>
                {newEvent.subject && (
                  <div className="mb-2">
                    <small className="text-muted d-block mb-1 d-flex align-items-center gap-1">
                      <MdMenuBook /> Subject
                    </small>
                    <Badge bg="secondary" className="fw-normal">
                      {newEvent.subject.label || newEvent.subject}
                    </Badge>
                  </div>
                )}

                {newEvent.preference && (
                  <div className="mb-3">
                    <small className="text-muted d-block mb-1 d-flex align-items-center gap-1">
                      <MdFlag /> Preference
                    </small>
                    <Badge bg="primary" className="fw-normal">
                      {newEvent.preference}
                    </Badge>
                  </div>
                )}

                <Form.Group className="mb-0">
                  <Form.Label htmlFor="approvalStatus" className="small text-muted mb-1">Approval Status</Form.Label>
                  <Select
                    name="approvalStatus"
                    options={approvalOptions}
                    onChange={handleApprovalChange}
                    classNamePrefix="select"
                    defaultValue={
                      newEvent.approvalStatus === 'approved'
                        ? { value: 'approved', label: 'Approve' }
                        : newEvent.approvalStatus === 'denied'
                        ? { value: 'denied', label: 'Deny' }
                        : null
                    }
                  />
                </Form.Group>
              </Accordion.Body>
            </Accordion.Item>
          )}
        </Accordion>
    </BaseModal>
  );
};

export default EventForm;
