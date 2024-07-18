import React, { useState, useEffect } from 'react';
import moment from 'moment';
import Select from 'react-select';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase'; // Ensure the correct path to firebase is used

const EventDetailsModal = ({ event, handleClose, userEmail, userRole, events, setEvents }) => {
  const studentResponse = event.studentResponses?.find(response => response.email === userEmail);
  const [response, setResponse] = useState(studentResponse ? (studentResponse.response ? 'accepted' : 'declined') : '');

  const handleResponseChange = async (selectedOption) => {
    const isAccepted = selectedOption.value === 'accepted';
    setResponse(selectedOption.value);

    // Update student response in Firebase
    const updatedStudentResponses = [
      ...(event.studentResponses || []).filter(response => response.email !== userEmail),
      { email: userEmail, response: isAccepted },
    ];

    const updatedEvent = { ...event, studentResponses: updatedStudentResponses };
    const eventDoc = doc(db, 'events', event.id);

    try {
      await updateDoc(eventDoc, {
        studentResponses: updatedStudentResponses,
      });
      setEvents(events.map(evt => (evt.id === event.id ? updatedEvent : evt)));
    } catch (error) {
      console.error('Failed to update student response:', error);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 z-60">
        <h2 className="text-2xl font-bold text-center">Event Details</h2>
        <form className="space-y-6 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              value={event.title}
              readOnly
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 focus:outline-none sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={event.description}
              readOnly
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 focus:outline-none sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Start Time</label>
            <input
              type="datetime-local"
              value={moment(event.start).format('YYYY-MM-DDTHH:mm')}
              readOnly
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 focus:outline-none sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">End Time</label>
            <input
              type="datetime-local"
              value={moment(event.end).format('YYYY-MM-DDTHH:mm')}
              readOnly
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 focus:outline-none sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Staff</label>
            <Select
              isMulti
              value={event.staff}
              isDisabled
              className="basic-multi-select"
              classNamePrefix="select"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Classes</label>
            <Select
              isMulti
              value={event.classes}
              isDisabled
              className="basic-multi-select"
              classNamePrefix="select"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Students</label>
            <Select
              isMulti
              value={event.students}
              isDisabled
              className="basic-multi-select"
              classNamePrefix="select"
            />
          </div>
          {userRole === 'student' && event.minStudents > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">Your Response</label>
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
            </div>
          )}
          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-transparent rounded-md hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventDetailsModal;
