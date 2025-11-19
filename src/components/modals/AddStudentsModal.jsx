import React, { useState } from 'react';
import BaseModal from './BaseModal.jsx';

const AddStudentsModal = ({
    showStudentModal,
    setShowStudentModal,
    selectedClass,
    studentsToAdd,
    setStudentsToAdd,
    handleAddStudents,
}) => {
    const [uploadMode, setUploadMode] = useState('manual');

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split('\n').filter((line) => line.trim());

            // Parse CSV: each row has name,email
            const students = lines
                .map((line) => {
                    const [name, email] = line.split(',').map((col) => col.trim());
                    return { name, email };
                })
                .filter((student) => student.email); // Filter out invalid rows

            // Convert to format expected by handleAddStudents
            const studentsData = students.map((s) => `${s.name}:${s.email}`).join(',');
            setStudentsToAdd(studentsData);
        };
        reader.readAsText(file);
    };

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
                <label className="form-label">Upload Method</label>
                <div className="btn-group w-100 mb-3" role="group">
                    <button
                        type="button"
                        className={`btn ${uploadMode === 'manual' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setUploadMode('manual')}
                    >
                        Manual Entry
                    </button>
                    <button
                        type="button"
                        className={`btn ${uploadMode === 'csv' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setUploadMode('csv')}
                    >
                        Upload CSV
                    </button>
                </div>
            </div>

            {uploadMode === 'manual' ? (
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
            ) : (
                <div className="mb-3">
                    <label className="form-label">Upload CSV File</label>
                    <input
                        type="file"
                        className="form-control"
                        accept=".csv"
                        onChange={handleFileUpload}
                        required
                    />
                    <div className="form-text">CSV format: name,email (one student per line)</div>
                    {studentsToAdd && (
                        <div className="alert alert-info mt-2">
                            {studentsToAdd.split(',').length} student(s) loaded from CSV
                        </div>
                    )}
                </div>
            )}
        </BaseModal>
    );
};

export default AddStudentsModal;
