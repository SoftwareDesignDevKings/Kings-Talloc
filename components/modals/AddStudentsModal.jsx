import React from 'react';
import { Form } from 'react-bootstrap';
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
      <Form.Group className="mb-3">
        <Form.Label>Student Emails</Form.Label>
        <Form.Control
          as="textarea"
          rows={4}
          value={studentsToAdd}
          onChange={(e) => setStudentsToAdd(e.target.value)}
          placeholder="Enter emails separated by commas"
          required
        />
      </Form.Group>
    </BaseModal>
  );
};

export default AddStudentsModal;
