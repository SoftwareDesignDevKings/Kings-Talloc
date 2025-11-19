import React from 'react';

const StudentList = ({ cls, confirmRemoveStudent }) => {
    return (
        <div className="tw-mt-4">
            <h3 className="tw-text-lg tw-font-medium tw-text-indigo-600">Students</h3>
            {cls.students && cls.students.length > 0 ? (
                <ul className="tw-mt-2">
                    {cls.students.map((student) => (
                        <li
                            key={student.email}
                            className="tw-flex tw-justify-between tw-items-center tw-py-2 tw-px-4 tw-border tw-rounded-md tw-mb-2 tw-bg-gray-50"
                        >
                            <span>
                                {student.name
                                    ? `${student.name} (${student.email})`
                                    : student.email}
                            </span>
                            <button
                                onClick={() => confirmRemoveStudent(student, cls)}
                                className="tw-text-red-600 hover:tw-text-red-800 focus:tw-outline-none"
                            >
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="tw-text-sm tw-text-gray-600">No students added to this class.</p>
            )}
        </div>
    );
};

export default StudentList;
