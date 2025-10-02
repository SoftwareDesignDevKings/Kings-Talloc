"use client";

import React, { useEffect } from 'react';
import { Form } from 'react-bootstrap';
import Select from 'react-select';
import BaseModal from './BaseModal.jsx';

const ClassModal = ({
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
    <BaseModal
      show={showModal}
      onHide={() => setShowModal(false)}
      title={isEditing ? 'Edit Class' : 'Add Class'}
      onSubmit={handleAddClass}
      submitText={isEditing ? 'Save Changes' : 'Add Class'}
      size="md"
    >
      <Form.Group className="mb-3">
        <Form.Label>Class Name</Form.Label>
        <Form.Control
          type="text"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          required
        />
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Subject</Form.Label>
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
      </Form.Group>
    </BaseModal>
  );
};

export default ClassModal;
