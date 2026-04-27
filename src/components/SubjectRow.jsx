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
    const collapseId = `subject-collapse-${subject.id}`;
    const isExpanded = expandedSubject === subject.id;

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
                            data-bs-toggle="collapse"
                            data-bs-target={`#${collapseId}`}
                            aria-expanded={isExpanded}
                            aria-controls={collapseId}
                        >
                            {isExpanded ? 'Collapse' : 'Expand'}
                        </button>
                    </div>
                </td>
            </tr>
            <tr>
                <td colSpan="2" className="p-0">
                    <div
                        id={collapseId}
                        className={`collapse${isExpanded ? ' show' : ''}`}
                    >
                        <div className="p-3" style={{maxHeight: '15rem', overflowY: 'auto'}}>
                            <TutorList subject={subject} confirmRemoveTutor={confirmRemoveTutor} />
                        </div>
                    </div>
                </td>
            </tr>
        </>
    );
};

export default SubjectRow;
