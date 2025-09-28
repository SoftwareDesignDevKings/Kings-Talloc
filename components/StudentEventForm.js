"use client";

import React, { useState, useEffect } from 'react';
import moment from 'moment';
import Select from 'react-select';
import { db } from '@firebase/db';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { fetchAvailabilities } from '../firebase/fetchData';

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

  const isStudentCreated = newEvent.createdByStudent && newEvent.students.some(student => student.value === studentEmail);

  return (
    <div className="tw-fixed tw-inset-0 tw-flex tw-items-center tw-justify-center tw-bg-black tw-bg-opacity-50 tw-z-50">
      <div className="tw-bg-white tw-rounded-lg tw-shadow-lg tw-w-full tw-max-w-md tw-p-6 tw-z-60">
        <h2 className="tw-text-2xl tw-font-bold tw-text-center">{isEditing ? 'Edit Event' : 'Add New Event'}</h2>
        <form onSubmit={onSubmit} className="tw-space-y-6 tw-mt-4">
          {error && <div className="tw-text-red-500">{error}</div>}
          <div>
            <label htmlFor="title" className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">Title</label>
            <input
              type="text"
              name="title"
              id="title"
              value={newEvent.title}
              onChange={handleInputChange}
              className="tw-block tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500 sm:tw-text-sm"
              required
              disabled={!isStudentCreated}
            />
          </div>
          <div>
            <label htmlFor="description" className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">Description</label>
            <textarea
              name="description"
              id="description"
              value={newEvent.description}
              onChange={handleInputChange}
              className="tw-block tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500 sm:tw-text-sm"
              disabled={!isStudentCreated}
            />
          </div>
          <div>
            <label htmlFor="start" className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">Start Time</label>
            <input
              type="datetime-local"
              name="start"
              id="start"
              value={moment(newEvent.start).format('YYYY-MM-DDTHH:mm')}
              onChange={handleDateChange}
              className="tw-block tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500 sm:tw-text-sm"
              required
              disabled={!isStudentCreated}
            />
          </div>
          <div>
            <label htmlFor="end" className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">End Time</label>
            <input
              type="datetime-local"
              name="end"
              id="end"
              value={moment(newEvent.end).format('YYYY-MM-DDTHH:mm')}
              onChange={handleDateChange}
              className="tw-block tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500 sm:tw-text-sm"
              required
              disabled={!isStudentCreated}
            />
          </div>
          <div>
            <label htmlFor="tutor" className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">Assign Tutor</label>
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
          </div>
          {newEvent.minStudents > 0 && (
            <div>
              <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">Student Responses</label>
              {newEvent.studentResponses && newEvent.studentResponses.length > 0 ? (
                <ul className="tw-list-disc tw-list-inside">
                  {newEvent.studentResponses.map((response, index) => (
                    <li key={index}>
                      {response.email}: {response.response ? 'Accepted' : 'Declined'}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="tw-text-sm tw-text-gray-500">No students have responded yet.</p>
              )}
            </div>
          )}
          <div className="tw-flex tw-justify-between">
            <button
              type="button"
              onClick={() => setShowStudentModal(false)}
              className="tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-gray-700 tw-bg-gray-200 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-gray-300"
            >
              Cancel
            </button>
            {isEditing && isStudentCreated && (
              <button
                type="button"
                onClick={handleDelete}
                className="tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-white tw-bg-red-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-red-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-red-500"
              >
                Delete
              </button>
            )}
            <button
              type="submit"
              className="tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-white tw-bg-indigo-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-indigo-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-indigo-500"
              disabled={!isStudentCreated}
            >
              {isEditing ? 'Save Changes' : 'Add Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentEventForm;
