"use client";

import React, { useEffect, useState } from 'react';
import Select from 'react-select';

const ClassFormModal = ({
  showModal,
  setShowModal,
  className,
  setClassName,
  handleAddClass,
  subjects,
  selectedSubject,
  setSelectedSubject,
  isEditing,
}) => {
  useEffect(() => {
    if (!showModal) {
      setClassName('');
      setSelectedSubject(null);
    }
  }, [showModal, setClassName, setSelectedSubject]);

  return (
    showModal && (
      <div className="tw-fixed tw-inset-0 tw-flex tw-items-center tw-justify-center tw-bg-black tw-bg-opacity-50 tw-z-50">
        <div className="tw-bg-white tw-rounded-lg tw-shadow-lg tw-w-full tw-max-w-md tw-p-6 tw-z-60">
          <h2 className="tw-text-2xl tw-font-bold tw-text-center">{isEditing ? 'Edit Class' : 'Add Class'}</h2>
          <form onSubmit={handleAddClass} className="tw-space-y-4 tw-mt-4">
            <div>
              <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">Class Name</label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="tw-block tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500 sm:tw-text-sm"
                required
              />
            </div>
            <div>
              <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">Subject</label>
              <Select
                options={subjects}
                value={subjects.find(subject => subject.id === selectedSubject?.id)}
                onChange={setSelectedSubject}
                getOptionLabel={(option) => option.name}
                getOptionValue={(option) => option.id}
                className="basic-select"
                classNamePrefix="select"
                placeholder="Select a subject"
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
              <button
                type="submit"
                className="tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-white tw-bg-indigo-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-indigo-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-indigo-500"
              >
                {isEditing ? 'Save Changes' : 'Add Class'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  );
};

export default ClassFormModal;
