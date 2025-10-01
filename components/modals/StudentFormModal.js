import React from 'react';
import BaseModal from './BaseModal';

const StudentFormModal = ({
  showStudentModal,
  setShowStudentModal,
  selectedClass,
  studentsToAdd,
  setStudentsToAdd,
  handleAddStudents,
}) => {
  return (
    <BaseModal
      isOpen={showStudentModal}
      onClose={() => setShowStudentModal(false)}
      title={`Add Students to ${selectedClass?.name || ''}`}
      onSubmit={handleAddStudents}
      submitText="Add Students"
      modalId="student-form"
    >
      <div>
        <label className="tw-block tw-text-sm tw-font-medium tw-text-gray-700">Student Emails</label>
        <textarea
          value={studentsToAdd}
          onChange={(e) => setStudentsToAdd(e.target.value)}
          className="tw-block tw-w-full tw-px-3 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md tw-shadow-sm focus:tw-outline-none focus:tw-ring-indigo-500 focus:tw-border-indigo-500 sm:tw-text-sm"
          rows="4"
          placeholder="Enter emails separated by commas"
          required
        />
      </div>
    </BaseModal>
  );
};

export default StudentFormModal;
