"use client";

import React, { useState, useEffect } from 'react';
import moment from 'moment';
import Select, { components } from 'react-select';
import { Form, Row, Col, Alert } from 'react-bootstrap';
import BaseModal from '../modals/BaseModal.jsx';
import { db } from '@/firestore/db.js';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useEventForm } from '@/hooks/forms/useEventForm';
import { useEventOperations } from '@/hooks/calendar/useEventOperations';

const EventForm = ({
  isEditing,
  newEvent,
  setNewEvent,
  eventToEdit,
  setShowModal,
  eventsData,
  handleClassChange
}) => {
  const [staffOptions, setStaffOptions] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(newEvent.staff || []);
  const [classOptions, setClassOptions] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState(newEvent.classes || []);
  const [studentOptions, setStudentOptions] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState(newEvent.students || []);
  const [error, setError] = useState('');

  // Use specialized hooks
  const eventForm = useEventForm(eventsData);
  const { handleDeleteEvent } = useEventOperations(eventsData);

  // Get handlers from the hook
  const handleInputChange = eventForm.handleInputChange(newEvent, setNewEvent);
  const handleStaffChange = eventForm.handleStaffChange(newEvent, setNewEvent);
  const handleStudentChange = eventForm.handleStudentChange(newEvent, setNewEvent);

  useEffect(() => {
    const fetchStaff = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'tutor'));
      const querySnapshot = await getDocs(q);
      const staffList = await Promise.all(querySnapshot.docs.map(async docSnap => {
        const tutorData = docSnap.data();
        const availabilityQuery = query(
          collection(db, 'availabilities'),
          where('tutor', '==', docSnap.id)
        );
        const availabilitySnapshot = await getDocs(availabilityQuery);
        let availabilityStatus = 'unavailable';

        if (!availabilitySnapshot.empty) {
          const available = availabilitySnapshot.docs.some(availabilityDoc => {
            const availabilityData = availabilityDoc.data();
            const availabilityStart = availabilityData.start.toDate();
            const availabilityEnd = availabilityData.end.toDate();
            const eventStart = new Date(newEvent.start);
            const eventEnd = new Date(newEvent.end);

            return eventStart >= availabilityStart && eventEnd <= availabilityEnd;
          });

          if (available) {
            availabilityStatus = availabilitySnapshot.docs[0].data().locationType || 'onsite';
          }
        }

        return {
          value: docSnap.id,
          label: tutorData.name || tutorData.email,
          status: availabilityStatus
        };
      }));

      setStaffOptions(staffList);
    };

    const fetchClasses = async () => {
      const querySnapshot = await getDocs(collection(db, 'classes'));
      const classList = querySnapshot.docs.map(docSnap => ({
        value: docSnap.id,
        label: docSnap.data().name,
      }));
      setClassOptions(classList);
    };

    const fetchStudents = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      const querySnapshot = await getDocs(q);
      const studentList = querySnapshot.docs.map(docSnap => ({
        value: docSnap.id,
        label: docSnap.data().name || docSnap.data().email,
      }));
      setStudentOptions(studentList);
    };

    fetchStaff();
    fetchClasses();
    fetchStudents();
  }, [newEvent.start, newEvent.end]);

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

        <Row>
          {/* LEFT COLUMN */}
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label htmlFor="title">Title</Form.Label>
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
              <Form.Label htmlFor="description">Description</Form.Label>
              <Form.Control
                    as="textarea"
                    rows={3}
                    name="description"
                    id="description"
                    value={newEvent.description}
                    onChange={handleInputChange}
                  />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label htmlFor="start">Start Time</Form.Label>
              <Form.Control
                    type="datetime-local"
                    name="start"
                    id="start"
                    value={moment(newEvent.start).format('YYYY-MM-DDTHH:mm')}
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
                    value={moment(newEvent.end).format('YYYY-MM-DDTHH:mm')}
                    onChange={handleInputChange}
                    required
                  />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label htmlFor="staff">Assign Tutor</Form.Label>
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
              <Form.Label htmlFor="classes">Assign Classes</Form.Label>
              <Select
                    isMulti
                    name="classes"
                    options={classOptions}
                    value={selectedClasses}
                    onChange={handleClassSelectChange}
                    classNamePrefix="select"
                  />
            </Form.Group>
          </Col>

          {/* RIGHT COLUMN */}
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label htmlFor="students">Assign Students</Form.Label>
              <Select
                    isMulti
                    name="students"
                    options={studentOptions}
                    value={selectedStudents}
                    onChange={handleStudentSelectChange}
                    classNamePrefix="select"
                  />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label htmlFor="minStudents">Minimum Students Required</Form.Label>
              <Form.Control
                    type="number"
                    name="minStudents"
                    id="minStudents"
                    value={newEvent.minStudents || 0}
                    onChange={handleMinStudentsChange}
                  />
            </Form.Group>

                {newEvent.minStudents > 0 && (
              <Form.Group className="mb-3">
                <Form.Label>Student Responses</Form.Label>
                    {newEvent.studentResponses && newEvent.studentResponses.length > 0 ? (
                      <ul className="list-unstyled">
                        {newEvent.studentResponses.map((response, index) => (
                          <li key={index} className="mb-1">
                            <span className="fw-semibold">{response.email}:</span>{' '}
                            <span className={`badge ${response.response ? 'bg-success' : 'bg-danger'}`}>
                              {response.response ? 'Accepted' : 'Declined'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted mb-0">No students have responded yet.</p>
                    )}
              </Form.Group>
                )}

                {newEvent.createdByStudent && (
              <Form.Group className="mb-3">
                <Form.Label htmlFor="approvalStatus">Approval Status</Form.Label>
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
                )}

            <Form.Group className="mb-3">
              <Form.Label htmlFor="workStatus">Work Status</Form.Label>
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
          </Col>
        </Row>
    </BaseModal>
  );
};

export default EventForm;
