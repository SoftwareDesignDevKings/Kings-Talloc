import React from 'react';
import { Form } from 'react-bootstrap';
import BaseModal from './BaseModal.jsx';

const AddTutorsModal = ({
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
      show={showTutorModal}
      onHide={() => setShowTutorModal(false)}
      title={`Add Tutors to ${selectedSubject?.name || ''}`}
      size="md"
      onSubmit={handleSubmit}
      submitText="Add Tutors"
    >
      <Form.Group className="mb-3">
        <Form.Label>Tutor Emails</Form.Label>
        <Form.Control
          as="textarea"
          rows={4}
          value={tutorsToAdd}
          onChange={(e) => setTutorsToAdd(e.target.value)}
          placeholder="Enter emails separated by commas"
          required
        />
      </Form.Group>
    </BaseModal>
  );
};

export default AddTutorsModal;
