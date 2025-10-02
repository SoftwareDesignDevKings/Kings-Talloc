"use client";

import React, { useState, useEffect } from 'react';
import { Form } from 'react-bootstrap';
import BaseModal from './BaseModal.jsx';

const SubjectModal = ({ showModal, setShowModal, subject, handleSubmit }) => {
  const [subjectName, setSubjectName] = useState('');

  useEffect(() => {
    if (subject) {
      setSubjectName(subject.name);
    } else {
      setSubjectName('');
    }
  }, [subject]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSubmit({ name: subjectName });
    setShowModal(false);
  };

  return (
    <BaseModal
      show={showModal}
      onHide={() => setShowModal(false)}
      title={subject ? 'Edit Subject' : 'Add Subject'}
      onSubmit={handleFormSubmit}
      submitText={subject ? 'Save Changes' : 'Add Subject'}
      size="md"
    >
      <Form.Group className="mb-3">
        <Form.Label>Subject Name</Form.Label>
        <Form.Control
          type="text"
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
          required
        />
      </Form.Group>
    </BaseModal>
  );
};

export default SubjectModal;
