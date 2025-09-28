import React from 'react';
import { FiX } from 'react-icons/fi';

const Settings = ({ isOpen, onClose, calendarStartTime, calendarEndTime, setCalendarStartTime, setCalendarEndTime }) => {
  if (!isOpen) return null;

  const handleStartTimeChange = (e) => setCalendarStartTime(e.target.value);
  const handleEndTimeChange = (e) => setCalendarEndTime(e.target.value);

  return (
    <div className="tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-bg-black tw-bg-opacity-50">
      <div className="tw-bg-white tw-p-6 tw-rounded-lg tw-shadow-lg tw-w-1/3">
        <div className="tw-flex tw-justify-between tw-items-center tw-mb-4">
          <h2 className="tw-text-xl tw-font-bold">Settings</h2>
          <button onClick={onClose}>
            <FiX className="tw-text-xl" />
          </button>
        </div>
        <div className="tw-space-y-4">
          <div>
            <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">
              Calendar Start Time
            </label>
            <input
              type="time"
              value={calendarStartTime}
              onChange={handleStartTimeChange}
              className="tw-mt-1 tw-block tw-w-full tw-py-2 tw-px-3 tw-border tw-border-gray-300 tw-bg-white tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500 sm:tw-text-sm"
            />
          </div>
          <div>
            <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">
              Calendar End Time
            </label>
            <input
              type="time"
              value={calendarEndTime}
              onChange={handleEndTimeChange}
              className="tw-mt-1 tw-block tw-w-full tw-py-2 tw-px-3 tw-border tw-border-gray-300 tw-bg-white tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500 sm:tw-text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
