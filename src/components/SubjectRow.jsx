import React from 'react';
import TutorList from './TutorList.jsx';

const SubjectRow = ({
    subject,
    handleOpenTutorModal,
    confirmDeleteSubject,
    handleExpandSubject,
    expandedSubject,
    confirmRemoveTutor,
    handleEditSubject,
}) => {
    return (
        <>
            <tr>
                <td>{subject.name}</td>
                <td>
                    <div className="d-flex gap-2">
                        <button
                            onClick={() => handleEditSubject(subject)}
                            className="btn btn-sm btn-outline-primary"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => handleOpenTutorModal(subject)}
                            className="btn btn-sm btn-outline-primary"
                        >
                            Add Tutors
                        </button>
                        <button
                            onClick={() => confirmDeleteSubject(subject)}
                            className="btn btn-sm btn-outline-danger"
                        >
                            Delete
                        </button>
                        <button
                            onClick={() => handleExpandSubject(subject)}
                            className="btn btn-sm btn-outline-secondary"
                        >
                            {expandedSubject === subject.id ? 'Collapse' : 'Expand'}
                        </button>
                    </div>
                </td>
            </tr>
            {expandedSubject === subject.id && (
                <tr>
                    <td colSpan="2" className="p-3">
                        <div style={{ maxHeight: '15rem', overflowY: 'auto' }}>
                            <TutorList subject={subject} confirmRemoveTutor={confirmRemoveTutor} />
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};

export default SubjectRow;
