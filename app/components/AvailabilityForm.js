import React, { useState } from 'react';
import moment from 'moment';

const AvailabilityForm = ({
  isEditing,
  newAvailability,
  setNewAvailability,
  handleInputChange,
  handleSubmit,
  handleDelete,
  setShowModal
}) => {
  const [error, setError] = useState('');

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

  const onSubmit = (e) => {
    e.preventDefault();
    if (validateDates()) {
      handleSubmit(e);
    }
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

export default AvailabilityForm;
