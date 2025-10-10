"use client";

import React, { useState, useEffect } from 'react';
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
      size="md"
      onSubmit={handleFormSubmit}
      submitText={subject ? 'Save Changes' : 'Add Subject'}
    >
      <div className="mb-3">
        <label className="form-label">Subject Name</label>
        <input
          type="text"
          className="form-control"
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
          required
        />
      </div>
    </BaseModal>
  );
};

export default SubjectModal;
