"use client";

import React, { useState, useEffect } from 'react';
import { isAfter, isBefore, isSameOrBefore, isSameOrAfter, format } from 'date-fns';
import Select from 'react-select';
import { Form, Alert, Button, ButtonGroup } from 'react-bootstrap';
import BaseModal from '../modals/BaseModal.jsx';
import { db } from '@/firestore/clientFirestore.js';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { fetchAvailabilities } from '../../firestore/firebaseFetch';

const StudentEventForm = ({ isEditing, newEvent, setNewEvent, handleInputChange, handleSubmit, handleDelete, setShowStudentModal, studentEmail }) => {
  const [tutorOptions, setTutorOptions] = useState([]);
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [filteredTutors, setFilteredTutors] = useState([]);
  const [selectedTutor, setSelectedTutor] = useState(newEvent.staff && newEvent.staff.length > 0 ? newEvent.staff[0] : null);
  const [selectedSubject, setSelectedSubject] = useState(newEvent.subject || null);
  const [selectedPreference, setSelectedPreference] = useState(newEvent.preference || null);
  const [selectedStudent, setSelectedStudent] = useState(newEvent.students && newEvent.students.length > 0 ? newEvent.students[0] : { value: studentEmail, label: studentEmail });
  const [availabilities, setAvailabilities] = useState([]);
  const [error, setError] = useState('');

  const preferenceOptions = ['Homework (Prep)', 'Assignments', 'Exam Help', 'General'];

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

    const fetchSubjects = async () => {
      const querySnapshot = await getDocs(collection(db, 'subjects'));
      const subjectList = querySnapshot.docs.map(doc => ({
        value: doc.id,
        label: doc.data().name,
      }));
      setSubjectOptions(subjectList);
    };

    const fetchAllData = async () => {
      await fetchTutors();
      await fetchSubjects();
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

  const handleSubjectChange = (selectedOption) => {
    setSelectedSubject(selectedOption);
    setNewEvent({ ...newEvent, subject: selectedOption });
  };

  const handlePreferenceClick = (preference) => {
    setSelectedPreference(preference);
    setNewEvent({ ...newEvent, preference });
  };

  const validateDates = () => {
    const start = new Date(newEvent.start);
    const end = new Date(newEvent.end);
    if (!isAfter(end, start)) {
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
        const availStart = new Date(availability.start);
        const availEnd = new Date(availability.end);
        return (availStart <= start || availStart.getTime() === start.getTime()) &&
               (availEnd >= end || availEnd.getTime() === end.getTime())
          && (availability.workType == "tutoring" || availability.workType == "tutoringOrWork" || availability.workType == undefined); // undefined check for backwards compatibility
      });
    });
    setFilteredTutors(availableTutors);
  };

  const handleDateChange = (e) => {
    handleInputChange(e);
    const { name, value } = e.target;
    if (name === 'start' || name === 'end') {
      const start = name === 'start' ? new Date(value) : new Date(newEvent.start);
      const end = name === 'end' ? new Date(value) : new Date(newEvent.end);
      filterTutorsByAvailability(start, end);
    }
  };

  const handleMenuOpen = () => {
    const start = new Date(newEvent.start);
    const end = new Date(newEvent.end);
    filterTutorsByAvailability(start, end);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (validateDates()) {
      // Set title to just "Tutoring"
      newEvent.title = 'Tutoring';

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
        <Form.Label htmlFor="start">Start Time</Form.Label>
        <Form.Control
          type="datetime-local"
          name="start"
          id="start"
          value={format(new Date(newEvent.start), "yyyy-MM-dd'T'HH:mm")}
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
          value={format(new Date(newEvent.end), "yyyy-MM-dd'T'HH:mm")}
          onChange={handleDateChange}
          required
          disabled={!isStudentCreated}
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label htmlFor="subject">Subject</Form.Label>
        <Select
          name="subject"
          options={subjectOptions}
          value={selectedSubject}
          onChange={handleSubjectChange}
          classNamePrefix="select"
          placeholder="Select a subject"
          isDisabled={!isStudentCreated}
        />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Preference</Form.Label>
        <div className="d-flex flex-wrap gap-2">
          {preferenceOptions.map((preference) => (
            <Button
              key={preference}
              variant={selectedPreference === preference ? 'primary' : 'outline-primary'}
              size="sm"
              onClick={() => handlePreferenceClick(preference)}
              disabled={!isStudentCreated}
            >
              {preference}
            </Button>
          ))}
        </div>
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
