"use client";

import React, { useState } from 'react';
import moment from 'moment';
import Select from 'react-select';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@firebase/db';

const EventDetailsModal = ({ event, handleClose, userEmail, userRole, events, setEvents }) => {
  const studentResponse = event.studentResponses?.find(response => response.email === userEmail);
  const [response, setResponse] = useState(studentResponse ? (studentResponse.response ? 'accepted' : 'declined') : '');
  const [workStatus, setWorkStatus] = useState(event.workStatus || 'notCompleted');

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

  const handleWorkStatusChange = async (selectedOption) => {
    const newWorkStatus = selectedOption.value;
    setWorkStatus(newWorkStatus);

    const updatedEvent = { ...event, workStatus: newWorkStatus };
    const eventDoc = doc(db, 'events', event.id);

    try {
      await updateDoc(eventDoc, {
        workStatus: newWorkStatus,
      });
      setEvents(events.map(evt => (evt.id === event.id ? updatedEvent : evt)));
    } catch (error) {
      console.error('Failed to update work status:', error);
    }
  };

  const workStatusOptions = [
    { value: 'notCompleted', label: 'Not Completed' },
    { value: 'completed', label: 'Completed' },
    { value: 'notAttended', label: "Student Didn't Attend" },
  ];

  return (
    <div className="tw-fixed tw-inset-0 tw-flex tw-items-center tw-justify-center tw-bg-black tw-bg-opacity-50 tw-z-50">
      <div className="tw-bg-white tw-rounded-lg tw-shadow-lg tw-w-full tw-max-w-md tw-p-6 tw-z-60">
        <h2 className="tw-text-2xl tw-font-bold tw-text-center">Event Details</h2>
        <form className="tw-space-y-6 tw-mt-4">
          <div>
            <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">Title</label>
            <input
              type="text"
              value={event.title}
              readOnly
              className="tw-block tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm tw-bg-gray-100 focus:tw-outline-none sm:tw-text-sm"
            />
          </div>
          <div>
            <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">Description</label>
            <textarea
              value={event.description}
              readOnly
              className="tw-block tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm tw-bg-gray-100 focus:tw-outline-none sm:tw-text-sm"
            />
          </div>
          <div>
            <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">Start Time</label>
            <input
              type="datetime-local"
              value={moment(event.start).format('YYYY-MM-DDTHH:mm')}
              readOnly
              className="tw-block tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm tw-bg-gray-100 focus:tw-outline-none sm:tw-text-sm"
            />
          </div>
          <div>
            <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">End Time</label>
            <input
              type="datetime-local"
              value={moment(event.end).format('YYYY-MM-DDTHH:mm')}
              readOnly
              className="tw-block tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm tw-bg-gray-100 focus:tw-outline-none sm:tw-text-sm"
            />
          </div>
          <div>
            <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">Staff</label>
            <Select
              isMulti
              value={event.staff}
              isDisabled
              className="basic-multi-select"
              classNamePrefix="select"
            />
          </div>
          <div>
            <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">Classes</label>
            <Select
              isMulti
              value={event.classes}
              isDisabled
              className="basic-multi-select"
              classNamePrefix="select"
            />
          </div>
          <div>
            <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">Students</label>
            <Select
              isMulti
              value={event.students}
              isDisabled
              className="basic-multi-select"
              classNamePrefix="select"
            />
          </div>
          {userRole === 'student' && event.minStudents > 0 && (
            <div className="tw-mt-4">
              <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">Your Response</label>
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
          {userRole === 'tutor' && (
            <div>
              <label htmlFor="workStatus" className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">Work Status</label>
              <Select
                name="workStatus"
                options={workStatusOptions}
                value={workStatusOptions.find(option => option.value === workStatus)}
                onChange={handleWorkStatusChange}
                classNamePrefix="select"
              />
            </div>
          )}
          <div className="tw-flex tw-justify-center tw-mt-4">
            <button
              type="button"
              onClick={handleClose}
              className="tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-gray-700 tw-bg-gray-200 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-gray-300"
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
