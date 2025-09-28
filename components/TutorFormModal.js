import React from 'react';

const TutorFormModal = ({
  showTutorModal,
  setShowTutorModal,
  selectedSubject,
  tutorsToAdd,
  setTutorsToAdd,
  handleAddTutors,
}) => {
  return (
    showTutorModal && (
      <div className="tw-fixed tw-inset-0 tw-flex tw-items-center tw-justify-center tw-bg-black tw-bg-opacity-50 tw-z-50">
        <div className="tw-bg-white tw-rounded-lg tw-shadow-lg tw-w-full tw-max-w-md tw-p-6 tw-z-60">
          <h2 className="tw-text-2xl tw-font-bold tw-text-center">Add Tutors to {selectedSubject.name}</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleAddTutors(tutorsToAdd.split(',').map(email => email.trim()));
          }} className="tw-space-y-4 tw-mt-4">
            <div>
              <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">Tutor Emails</label>
              <textarea
                value={tutorsToAdd}
                onChange={(e) => setTutorsToAdd(e.target.value)}
                className="tw-block tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500 sm:tw-text-sm"
                rows="4"
                placeholder="Enter emails separated by commas"
                required
              />
            </div>
            <div className="tw-flex tw-justify-between">
              <button
                type="button"
                onClick={() => setShowTutorModal(false)}
                className="tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-gray-700 tw-bg-gray-200 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-white tw-bg-indigo-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-indigo-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-indigo-500"
              >
                Add Tutors
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  );
};

export default TutorFormModal;
