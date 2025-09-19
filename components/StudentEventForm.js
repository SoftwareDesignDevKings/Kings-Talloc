import React, { useState, useEffect } from 'react';
import moment from 'moment';
import Select from 'react-select';
import { db } from '@firebase/db';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { fetchAvailabilities } from './calendar/fetchData';

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
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 z-60">
        <h2 className="text-2xl font-bold text-center">{isEditing ? 'Edit Event' : 'Add New Event'}</h2>
        <form onSubmit={onSubmit} className="space-y-6 mt-4">
          {error && <div className="text-red-500">{error}</div>}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              name="title"
              id="title"
              value={newEvent.title}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
              disabled={!isStudentCreated}
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              id="description"
              value={newEvent.description}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              disabled={!isStudentCreated}
            />
          </div>
          <div>
            <label htmlFor="start" className="block text-sm font-medium text-gray-700">Start Time</label>
            <input
              type="datetime-local"
              name="start"
              id="start"
              value={moment(newEvent.start).format('YYYY-MM-DDTHH:mm')}
              onChange={handleDateChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
              disabled={!isStudentCreated}
            />
          </div>
          <div>
            <label htmlFor="end" className="block text-sm font-medium text-gray-700">End Time</label>
            <input
              type="datetime-local"
              name="end"
              id="end"
              value={moment(newEvent.end).format('YYYY-MM-DDTHH:mm')}
              onChange={handleDateChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
              disabled={!isStudentCreated}
            />
          </div>
          <div>
            <label htmlFor="tutor" className="block text-sm font-medium text-gray-700">Assign Tutor</label>
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
              <label className="block text-sm font-medium text-gray-700">Student Responses</label>
              {newEvent.studentResponses && newEvent.studentResponses.length > 0 ? (
                <ul className="list-disc list-inside">
                  {newEvent.studentResponses.map((response, index) => (
                    <li key={index}>
                      {response.email}: {response.response ? 'Accepted' : 'Declined'}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No students have responded yet.</p>
              )}
            </div>
          )}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setShowStudentModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-transparent rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            {isEditing && isStudentCreated && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
