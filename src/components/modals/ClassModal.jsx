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
    teachers,
    selectedTeacher,
    setSelectedTeacher,
    isEditing,
}) => {
    useEffect(() => {
        if (!showModal) {
            setClassName('');
            setSelectedSubject(null);
            setSelectedTeacher(null);
        }
    }, [showModal, setClassName, setSelectedSubject, setSelectedTeacher]);

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
                    key={`subject-${isEditing ? selectedSubject?.id ?? 'edit' : 'new'}`}
                    options={subjects}
                    value={subjects.find((subject) => subject.id === selectedSubject?.id) ?? null}
                    onChange={setSelectedSubject}
                    getOptionLabel={(option) => option.name}
                    getOptionValue={(option) => option.id}
                    className="w-100 mb-3"
                    classNamePrefix="select"
                    placeholder="Select a subject"
                    required
                />
            </div>

            <div className="mb-3">
                <label className="form-label">Teacher</label>
                <Select
                    key={`teacher-${isEditing ? selectedTeacher?.email ?? 'edit' : 'new'}`}
                    options={teachers}
                    value={teachers.find((teacher) => teacher.email === selectedTeacher?.email) ?? null}
                    onChange={setSelectedTeacher}
                    getOptionLabel={(option) => option.name}
                    getOptionValue={(option) => option.email}
                    className="w-100 mb-4"
                    classNamePrefix="select"
                    placeholder="Select a teacher"
                    required
                />
            </div>
        </BaseModal>
    );
};

export default ClassModal;
