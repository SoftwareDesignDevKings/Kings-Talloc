import React from 'react';
import BaseModal from './BaseModal.jsx';

const AddStudentsModal = ({
  showStudentModal,
  setShowStudentModal,
  selectedClass,
  studentsToAdd,
  setStudentsToAdd,
  handleAddStudents,
}) => {
  return (
    <BaseModal
      show={showStudentModal}
      onHide={() => setShowStudentModal(false)}
      title={`Add Students to ${selectedClass?.name || ''}`}
      size="md"
      onSubmit={handleAddStudents}
      submitText="Add Students"
    >
      <div className="mb-3">
        <label className="form-label">Student Emails</label>
        <textarea
          className="form-control"
          rows={4}
          value={studentsToAdd}
          onChange={(e) => setStudentsToAdd(e.target.value)}
          placeholder="Enter emails separated by commas"
          required
        />
      </div>
    </BaseModal>
  );
};

export default AddStudentsModal;
