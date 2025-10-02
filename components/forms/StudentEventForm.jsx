"use client";

import React, { useState, useEffect } from 'react';
import moment from 'moment';
import Select from 'react-select';
import { Form, Alert } from 'react-bootstrap';
import BaseModal from '../modals/BaseModal.jsx';
import { db } from '@firebase/db';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { fetchAvailabilities } from '../../firebase/fetchData';

const StudentEventForm = ({ isEditing, newEvent, setNewEvent, handleInputChange, handleSubmit, handleDelete, setShowStudentModal, studentEmail }) => {
  const [tutorOptions, setTutorOptions] = useState([]);
  const [filteredTutors, setFilteredTutors] = useState([]);
  const [selectedTutor, setSelectedTutor] = useState(newEvent.staff && newEvent.staff.length > 0 ? newEvent.staff[0] : null);
  const [selectedStudent, setSelectedStudent] = useState(newEvent.students && newEvent.students.length > 0 ? newEvent.students[0] : { value: studentEmail, label: studentEmail });
  const [availabilities, setAvailabilities] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTutors = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'tutor'));
      const querySnapshot = await getDocs(q);
      const tutorList = querySnapshot.docs.map(doc => ({
        value: doc.data().email,
        label: doc.data().name || doc.data().email,
      }));
      setTutorOptions(tutorList);
    };

    const fetchAllData = async () => {
      await fetchTutors();
      await fetchAvailabilities(setAvailabilities);
    };

    fetchAllData();
  }, []);

  useEffect(() => {
    if (!isEditing) {
      setNewEvent({ ...newEvent, students: [selectedStudent], createdByStudent: true, approvalStatus: 'pending' });
    }
  }, [selectedStudent]);

  const handleTutorSelectChange = (selectedOption) => {
    setSelectedTutor(selectedOption);
    setNewEvent({ ...newEvent, staff: [selectedOption] });
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

  const filterTutorsByAvailability = (start, end) => {
    const availableTutors = tutorOptions.filter(tutor => {
      const tutorAvailabilities = availabilities.filter(availability => availability.tutor === tutor.value);
      return tutorAvailabilities.some(availability => {
        return moment(availability.start).isSameOrBefore(start) && moment(availability.end).isSameOrAfter(end)
          && (availability.workType == "tutoring" || availability.workType == "tutoringOrWork" || availability.workType == undefined); // undefined check for backwards compatibility
      });
    });
    setFilteredTutors(availableTutors);
  };

  const handleDateChange = (e) => {
    handleInputChange(e);
    const { name, value } = e.target;
    if (name === 'start' || name === 'end') {
      const start = name === 'start' ? moment(value) : moment(newEvent.start);
      const end = name === 'end' ? moment(value) : moment(newEvent.end);
      filterTutorsByAvailability(start, end);
    }
  };

  const handleMenuOpen = () => {
    const start = moment(newEvent.start);
    const end = moment(newEvent.end);
    filterTutorsByAvailability(start, end);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (validateDates()) {
      handleSubmit(e);
    }
  };

  // For new events, allow editing. For existing events, only allow if student created it
  const isStudentCreated = !isEditing || (newEvent.createdByStudent && newEvent.students?.some(student => student.value === studentEmail));

  return (
    <BaseModal
      show={true}
      onHide={() => setShowStudentModal(false)}
      title={isEditing ? 'Edit Event' : 'Add New Event'}
      size="md"
      onSubmit={onSubmit}
      submitText={isEditing ? 'Save Changes' : 'Add Event'}
      disabled={!isStudentCreated}
      deleteButton={(isEditing && isStudentCreated) ? {
        text: "Delete",
        onClick: handleDelete,
        variant: "danger"
      } : null}
    >
      {error && <Alert variant="danger">{error}</Alert>}

      <Form.Group className="mb-3">
        <Form.Label htmlFor="title">Title</Form.Label>
        <Form.Control
          type="text"
          name="title"
          id="title"
          value={newEvent.title}
          onChange={handleInputChange}
          required
          disabled={!isStudentCreated}
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
          disabled={!isStudentCreated}
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label htmlFor="start">Start Time</Form.Label>
        <Form.Control
          type="datetime-local"
          name="start"
          id="start"
          value={moment(newEvent.start).format('YYYY-MM-DDTHH:mm')}
          onChange={handleDateChange}
          required
          disabled={!isStudentCreated}
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label htmlFor="end">End Time</Form.Label>
        <Form.Control
          type="datetime-local"
          name="end"
          id="end"
          value={moment(newEvent.end).format('YYYY-MM-DDTHH:mm')}
          onChange={handleDateChange}
          required
          disabled={!isStudentCreated}
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label htmlFor="tutor">Assign Tutor</Form.Label>
        <Select
          name="tutor"
          options={filteredTutors}
          value={selectedTutor}
          onChange={handleTutorSelectChange}
          onMenuOpen={handleMenuOpen}
          classNamePrefix="select"
          isDisabled={!isStudentCreated}
          noOptionsMessage={() => "No tutors available for the selected time range"}
        />
      </Form.Group>
      {newEvent.minStudents > 0 && (
        <Form.Group className="mb-3">
          <Form.Label>Student Responses</Form.Label>
          {newEvent.studentResponses && newEvent.studentResponses.length > 0 ? (
            <ul className="list-unstyled">
              {newEvent.studentResponses.map((response, index) => (
                <li key={index} className="mb-1">
                  {response.email}: {response.response ? 'Accepted' : 'Declined'}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No students have responded yet.</p>
          )}
        </Form.Group>
      )}
    </BaseModal>
  );
};

export default StudentEventForm;
