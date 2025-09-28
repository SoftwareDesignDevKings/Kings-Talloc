"use client";

import React, { useState } from 'react';
import moment from 'moment';
import Select from 'react-select';
import Button from 'react-bootstrap/Button';
import { ButtonGroup } from 'react-bootstrap';

const TutorAvailabilityForm = ({ isEditing, newAvailability, setNewAvailability, handleInputChange, handleSubmit, 
                            handleDelete, setShowModal}) => {

  const [error, setError] = useState('');

  const locationOptions = [
    { value: 'onsite', label: 'Onsite' },
    { value: 'remote', label: 'Remote' },
  ];

  const workTypeOptions = [
    { value: 'tutoring', label: 'Tutoring' },
    { value: 'tutoringOrWork', label: 'Tutoring Or Work' },
    { value: 'work', label: 'Work' }

  ];

  const validateDates = () => {
    const start = moment(newAvailability.start);
    const end = moment(newAvailability.end);
    if (end.isSameOrBefore(start)) {
      setError('End date must be after the start date.');
      return false;
    }
    setError('');
    return true;
  };

  const setHours = (hours) => {
    if (newAvailability.start) {
      const newEnd = moment(newAvailability.start).add(hours, 'hours');
      setNewAvailability({ ...newAvailability, end: newEnd.toISOString() });
    } else {
      setError("Invalid hours")
    }
  }
  const onSubmit = async (e) => {
    e.preventDefault();
    if (validateDates()) {
      handleSubmit(e);
    }

    // await fetch("/api/send-event", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     subject: "Math Tutoring - Year 10",
    //     start: "2025-09-17T14:00:00",
    //     end: "2025-09-17T15:00:00",
    //     attendees: ["mmei@kings.edu.au", "vpatel@kings.edu.au", "eqsu@kings.edu.au"],
    //   }),
    // });
  };

  const handleLocationChange = (selectedOption) => {
    setNewAvailability({ ...newAvailability, locationType: selectedOption.value });
  };

  const handleWorkTypeChange = async (selectedOption) => {
    setNewAvailability({ ...newAvailability, workType: selectedOption.value });
  };

  return (
    <div className="tw-fixed tw-inset-0 tw-flex tw-items-center tw-justify-center tw-bg-black tw-bg-opacity-50 tw-z-50">
      <div className="tw-bg-white tw-rounded-lg tw-shadow-lg tw-w-full tw-max-w-md tw-p-6 tw-z-60">
        <h2 className="tw-text-2xl tw-font-bold tw-text-center">{isEditing ? 'Edit Availability' : 'Add Availability'}</h2>
        <form onSubmit={onSubmit} className="tw-space-y-6 tw-mt-4">
          {error && <div className="tw-text-red-500">{error}</div>}
          <div>
            <label htmlFor="start" className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">Start Time</label>
            <input
              type="datetime-local"
              name="start"
              id="start"
              value={moment(newAvailability.start).format('YYYY-MM-DDTHH:mm')}
              onChange={handleInputChange}
              className="tw-block tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500 sm:tw-text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="end" className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">End Time</label>
            <input
              type="datetime-local"
              name="end"
              id="end"
              value={moment(newAvailability.end).format('YYYY-MM-DDTHH:mm')}
              onChange={handleInputChange}
              className="tw-block tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500 sm:tw-text-sm"
              required
            />
          </div>

          <div>
            <ButtonGroup>
              <Button variant="outline-primary" onClick={() => setHours(6)} >6hrs </Button>
              <Button variant="outline-secondary" onClick={() => setHours(3)} >3hrs </Button>
            </ButtonGroup>
          </div>
          <div>
            <label htmlFor="workType" className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">Work Type</label>
            <Select
              name="workType"
              options={workTypeOptions}
              value={workTypeOptions.find(option => option.value === newAvailability.workType)}
              onChange={handleWorkTypeChange}
              classNamePrefix="select"
            />
          </div>
          <div>
            <label htmlFor="locationType" className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">Location Type</label>
            <Select
              name="locationType"
              options={locationOptions}
              value={locationOptions.find(option => option.value === newAvailability.locationType)}
              onChange={handleLocationChange}
              classNamePrefix="select"
              required
            />
          </div>
          <div className="tw-flex tw-justify-between">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-gray-700 tw-bg-gray-200 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-gray-300"
            >
              Cancel
            </button>
            {isEditing && (
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
            >
              {isEditing ? 'Save Changes' : 'Add Availability'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TutorAvailabilityForm;
