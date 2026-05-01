import React from 'react';
import StudentList from './StudentList.jsx';
import t from '@/styles/manageTable.module.css';

const ClassRow = ({
    cls,
    handleOpenStudentModal,
    confirmDeleteClass,
    confirmRemoveStudent,
    handleEditClass,
    subjects,
    teachers,
    expandedClasses,
    handleExpandClass,
}) => {
    const isExpanded = expandedClasses.has(cls.id);
    const collapseId = `class-collapse-${cls.id}`;

    const getSubjectName = (subjectId) => {
        const subject = subjects.find((subject) => subject.id === subjectId);
        return subject ? subject.name : 'No Subject';
    };

    const getTeacherName = (teacherEmail) => {
        const teacher = teachers.find((teacher) => teacher.email === teacherEmail);
        return teacher ? teacher.name : 'No Teacher';
    };

    return (
        <>
            <tr>
                <td>{cls.name}</td>
                <td>{getSubjectName(cls.subject)}</td>
                <td>{getTeacherName(cls.teacherEmail)}</td>
                <td className={t.actionCol}>
                    <div className={t.actionGroup}>
                        <button
                            onClick={() => handleEditClass(cls)}
                            className="btn btn-sm btn-outline-primary"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => handleOpenStudentModal(cls)}
                            className="btn btn-sm btn-outline-primary"
                        >
                            Add Students
                        </button>
                        <button
                            onClick={() => handleExpandClass(cls)}
                            className="btn btn-sm btn-outline-secondary"
                            aria-expanded={isExpanded}
                            aria-controls={collapseId}
                        >
                            {isExpanded ? 'Collapse' : 'Expand Students'}
                        </button>
                        <button
                            onClick={() => confirmDeleteClass(cls)}
                            className="btn btn-sm btn-outline-danger"
                        >
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
            <tr className={t.expandRow}>
                <td colSpan={4}>
                    <div
                        id={collapseId}
                        role="region"
                        aria-label={`Students in ${cls.name}`}
                        className={`collapse${isExpanded ? ' show' : ''}`}
                    >
                        <div className={t.expandPanel}>
                            <div className={t.expandPanelInner}>
                                <StudentList cls={cls} confirmRemoveStudent={confirmRemoveStudent} />
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        </>
    );
};

export default ClassRow;
