import React, { useState } from 'react';
import moment from 'moment';
import Select from 'react-select';

const EventDetailsModal = ({ event, handleClose, handleConfirmation, userEmail, userRole }) => {
  const tutorResponse = event.tutorResponses?.find(response => response.email === userEmail);
  const studentResponse = event.studentResponses?.find(response => response.email === userEmail);
  const [response, setResponse] = useState(tutorResponse ? (tutorResponse.response ? 'accepted' : 'declined') : studentResponse ? (studentResponse.response ? 'accepted' : 'declined') : '');

  const handleResponseChange = (selectedOption) => {
    setResponse(selectedOption.value);
    handleConfirmation(event, selectedOption.value === 'accepted');
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
          {event.confirmationRequired && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Tutor Responses</label>
              {event.tutorResponses && event.tutorResponses.length > 0 ? (
                <ul className="list-disc list-inside">
                  {event.tutorResponses.map((response, index) => (
                    <li key={index}>
                      {response.email}: {response.response ? 'Accepted' : 'Declined'}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No tutors have responded yet.</p>
              )}
            </div>
          )}
          {event.minStudents > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Student Responses</label>
              {event.studentResponses && event.studentResponses.length > 0 ? (
                <ul className="list-disc list-inside">
                  {event.studentResponses.map((response, index) => (
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
          {(userRole === 'tutor' && event.confirmationRequired) || (userRole === 'student' && event.minStudents > 0) && (
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
