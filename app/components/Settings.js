import React from 'react';
import { FiX } from 'react-icons/fi';

const Settings = ({ isOpen, onClose, calendarStartTime, calendarEndTime, setCalendarStartTime, setCalendarEndTime }) => {
  if (!isOpen) return null;

  const handleStartTimeChange = (e) => setCalendarStartTime(e.target.value);
  const handleEndTimeChange = (e) => setCalendarEndTime(e.target.value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-1/3">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Settings</h2>
          <button onClick={onClose}>
            <FiX className="text-xl" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Calendar Start Time
            </label>
            <input
              type="time"
              value={calendarStartTime}
              onChange={handleStartTimeChange}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Calendar End Time
            </label>
            <input
              type="time"
              value={calendarEndTime}
              onChange={handleEndTimeChange}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
