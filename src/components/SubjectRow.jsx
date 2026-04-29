import React from 'react';
import TutorList from './TutorList.jsx';
import t from '@/styles/manageTable.module.css';

const SubjectRow = ({
    subject,
    handleOpenTutorModal,
    confirmDeleteSubject,
    handleExpandSubject,
    expandedSubjects,
    confirmRemoveTutor,
    handleEditSubject,
}) => {
    const collapseId = `subject-collapse-${subject.id}`;
    const isExpanded = expandedSubjects.has(subject.id);

    return (
        <>
            <tr>
                <td>{subject.name}</td>
                <td className={t.actionCol}>
                    <div className={t.actionGroup}>
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
                            onClick={() => handleExpandSubject(subject)}
                            className="btn btn-sm btn-outline-secondary"
                            aria-expanded={isExpanded}
                            aria-controls={collapseId}
                        >
                            {isExpanded ? 'Collapse' : 'Expand to view tutors'}
                        </button>
                        <button
                            onClick={() => confirmDeleteSubject(subject)}
                            className="btn btn-sm btn-outline-danger"
                        >
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
            <tr className={t.expandRow}>
                <td colSpan={2}>
                    <div
                        id={collapseId}
                        role="region"
                        aria-label={`Tutors for ${subject.name}`}
                        className={`${t.collapseWrap}${isExpanded ? ` ${t.collapseOpen}` : ''}`}
                    >
                        <div className={t.collapseInner}>
                            <div className={t.expandPanel}>
                                <div className={t.expandPanelInner}>
                                    <TutorList subject={subject} confirmRemoveTutor={confirmRemoveTutor} />
                                </div>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        </>
    );
};

export default SubjectRow;
