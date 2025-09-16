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
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 z-60">
        <h2 className="text-2xl font-bold text-center">{isEditing ? 'Edit Availability' : 'Add Availability'}</h2>
        <form onSubmit={onSubmit} className="space-y-6 mt-4">
          {error && <div className="text-red-500">{error}</div>}
          <div>
            <label htmlFor="start" className="block text-sm font-medium text-gray-700">Start Time</label>
            <input
              type="datetime-local"
              name="start"
              id="start"
              value={moment(newAvailability.start).format('YYYY-MM-DDTHH:mm')}
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
              value={moment(newAvailability.end).format('YYYY-MM-DDTHH:mm')}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
            <label htmlFor="workType" className="block text-sm font-medium text-gray-700">Work Type</label>
            <Select
              name="workType"
              options={workTypeOptions}
              value={workTypeOptions.find(option => option.value === newAvailability.workType)}
              onChange={handleWorkTypeChange}
              classNamePrefix="select"
            />
          </div>
          <div>
            <label htmlFor="locationType" className="block text-sm font-medium text-gray-700">Location Type</label>
            <Select
              name="locationType"
              options={locationOptions}
              value={locationOptions.find(option => option.value === newAvailability.locationType)}
              onChange={handleLocationChange}
              classNamePrefix="select"
              required
            />
          </div>
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
              {isEditing ? 'Save Changes' : 'Add Availability'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TutorAvailabilityForm;
