import React from 'react';

const StudentList = ({ cls, confirmRemoveStudent }) => {
    return (
        <div className="mt-4">
            <h3 className="h5 text-purple fw-medium">Students</h3>
            {cls.students && cls.students.length > 0 ? (
                <ul className="list-unstyled mt-3">
                    {cls.students.map((student) => (
                        <li
                            key={student.email}
                            className="d-flex justify-content-between align-items-center p-3 border rounded mb-2 bg-light"
                        >
                            <span>
                                {student.name
                                    ? `${student.name} (${student.email})`
                                    : student.email}
                            </span>
                            <button
                                onClick={() => confirmRemoveStudent(student, cls)}
                                className="btn btn-sm btn-link text-danger text-decoration-none"
                            >
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-muted small">No students added to this class.</p>
            )}
        </div>
    );
};

export default StudentList;
