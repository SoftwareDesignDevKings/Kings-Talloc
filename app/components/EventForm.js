import React, { useState, useEffect } from 'react';
import moment from 'moment';
import Select from 'react-select';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const EventForm = ({ isEditing, newEvent, setNewEvent, handleInputChange, handleSubmit, handleDelete, setShowModal, handleStaffChange, handleStudentChange, handleClassChange }) => {
  const [staffOptions, setStaffOptions] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(newEvent.staff || []);
  const [classOptions, setClassOptions] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState(newEvent.classes || []);
  const [studentOptions, setStudentOptions] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState(newEvent.students || []);

  useEffect(() => {
    const fetchStaff = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'tutor'));
      const querySnapshot = await getDocs(q);
      const staffList = querySnapshot.docs.map(doc => ({
        value: doc.id,
        label: doc.data().name || doc.data().email,
      }));
      setStaffOptions(staffList);
    };

    const fetchClasses = async () => {
      const querySnapshot = await getDocs(collection(db, 'classes'));
      const classList = querySnapshot.docs.map(doc => ({
        value: doc.id,
        label: doc.data().name,
      }));
      setClassOptions(classList);
    };

    const fetchStudents = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      const querySnapshot = await getDocs(q);
      const studentList = querySnapshot.docs.map(doc => ({
        value: doc.id,
        label: doc.data().name || doc.data().email,
      }));
      setStudentOptions(studentList);
    };

    fetchStaff();
    fetchClasses();
    fetchStudents();
  }, []);

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

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 z-60">
        <h2 className="text-2xl font-bold text-center">{isEditing ? 'Edit Event' : 'Add New Event'}</h2>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
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
            />
          </div>
          <div>
            <label htmlFor="start" className="block text-sm font-medium text-gray-700">Start Time</label>
            <input
              type="datetime-local"
              name="start"
              id="start"
              value={moment(newEvent.start).format('YYYY-MM-DDTHH:mm')}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="end" className="block text-sm font-medium text-gray-700">End Time</label>
            <input
              type="datetime-local"
              name="end"
              id="end"
              value={moment(newEvent.end).format('YYYY-MM-DDTHH:mm')}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="staff" className="block text-sm font-medium text-gray-700">Assign Tutor</label>
            <Select
              isMulti
              name="tutor"
              options={staffOptions}
              value={selectedStaff}
              onChange={handleStaffSelectChange}
              className="basic-multi-select"
              classNamePrefix="select"
            />
          </div>
          <div>
            <label htmlFor="classes" className="block text-sm font-medium text-gray-700">Assign Classes</label>
            <Select
              isMulti
              name="classes"
              options={classOptions}
              value={selectedClasses}
              onChange={handleClassSelectChange}
              className="basic-multi-select"
              classNamePrefix="select"
            />
          </div>
          <div>
            <label htmlFor="students" className="block text-sm font-medium text-gray-700">Assign Students</label>
            <Select
              isMulti
              name="students"
              options={studentOptions}
              value={selectedStudents}
              onChange={handleStudentSelectChange}
              className="basic-multi-select"
              classNamePrefix="select"
            />
          </div>
          <div>
            <label htmlFor="minStudents" className="block text-sm font-medium text-gray-700">Minimum Students Required</label>
            <input
              type="number"
              name="minStudents"
              id="minStudents"
              value={newEvent.minStudents || 0}
              onChange={handleMinStudentsChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-transparent rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            {isEditing && (
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
            >
              {isEditing ? 'Save Changes' : 'Add Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventForm;
