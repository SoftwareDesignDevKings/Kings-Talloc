import React from 'react';
import BaseModal from './BaseModal';

const TutorFormModal = ({
  showTutorModal,
  setShowTutorModal,
  selectedSubject,
  tutorsToAdd,
  setTutorsToAdd,
  handleAddTutors,
}) => {
  const handleSubmit = (e) => {
    handleAddTutors(tutorsToAdd.split(',').map(email => email.trim()));
  };

  return (
    <BaseModal
      isOpen={showTutorModal}
      onClose={() => setShowTutorModal(false)}
      title={`Add Tutors to ${selectedSubject?.name || ''}`}
      onSubmit={handleSubmit}
      submitText="Add Tutors"
      modalId="tutor-form"
    >
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
    </BaseModal>
  );
};

export default TutorFormModal;
