'use client';

import React, { useEffect } from 'react';
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
            size="md"
            onSubmit={handleAddClass}
            submitText={isEditing ? 'Save Changes' : 'Add Class'}
        >
            <div className="mb-3">
                <label className="form-label">Class Name</label>
                <input
                    type="text"
                    className="form-control"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    required
                />
            </div>

            <div className="mb-3">
                <label className="form-label">Subject</label>
                <Select
                    options={subjects}
                    value={subjects.find((subject) => subject.id === selectedSubject?.id)}
                    onChange={setSelectedSubject}
                    getOptionLabel={(option) => option.name}
                    getOptionValue={(option) => option.id}
                    className="w-100 mb-4"
                    classNamePrefix="select"
                    placeholder="Select a subject"
                    required
                />
            </div>
        </BaseModal>
    );
};

export default ClassModal;
