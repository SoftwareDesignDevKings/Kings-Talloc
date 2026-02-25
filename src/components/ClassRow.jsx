import React from 'react';
import StudentList from './StudentList.jsx';

const ClassRow = ({
    cls,
    handleOpenStudentModal,
    confirmDeleteClass,
    handleViewStudents,
    confirmRemoveStudent,
    handleEditClass,
    subjects,
    teachers,
}) => {
    const getSubjectName = (subjectId) => {
        const subject = subjects.find((subject) => subject.id === subjectId);
        return subject ? subject.name : 'No Subject';
    };

    const getTeacherName = (teacherEmail) => {
        const teacher = teachers.find((teacher) => teacher.email === teacherEmail);
        return teacher ? teacher.name : 'No Teacher';
    };

    return (
        <tr>
            <td>{cls.name}</td>
            <td>{getSubjectName(cls.subject)}</td>
            <td>{getTeacherName(cls.teacherEmail)}</td>
            <td>
                <div className="d-flex gap-2">
                    <button
                        onClick={() => {
                            handleEditClass(cls);
                        }}
                        className="btn btn-sm btn-primary"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => handleOpenStudentModal(cls)}
                        className="btn btn-sm btn-dark-blue"
                    >
                        Add Students
                    </button>
                    <button
                        onClick={() => handleViewStudents(cls)}
                        className="btn btn-sm btn-secondary"
                    >
                        View Students
                    </button>
                    <button
                        onClick={() => confirmDeleteClass(cls)}
                        className="btn btn-sm btn-danger"
                    >
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default ClassRow;
