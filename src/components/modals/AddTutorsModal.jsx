import React from 'react';
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
        handleAddTutors(tutorsToAdd.split(',').map((email) => email.trim()));
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
            <div className="mb-3">
                <label className="form-label">Tutor Emails</label>
                <textarea
                    className="form-control"
                    rows={4}
                    value={tutorsToAdd}
                    onChange={(e) => setTutorsToAdd(e.target.value)}
                    placeholder="Enter emails separated by commas"
                    required
                />
            </div>
        </BaseModal>
    );
};

export default AddTutorsModal;
