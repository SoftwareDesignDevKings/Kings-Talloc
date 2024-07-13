import React from 'react';

const StudentList = ({ cls, confirmRemoveStudent }) => {
  return (
    <div className="mt-4">
      <h3 className="text-lg font-medium text-indigo-600">Students</h3>
      {cls.students && cls.students.length > 0 ? (
        <ul className="mt-2">
          {cls.students.map(student => (
            <li
              key={student.email}
              className="flex justify-between items-center py-2 px-4 border rounded-md mb-2 bg-gray-50"
            >
              <span>{student.name ? `${student.name} (${student.email})` : student.email}</span>
              <button
                onClick={() => confirmRemoveStudent(student, cls)}
                className="text-red-600 hover:text-red-800 focus:outline-none"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-600">No students added to this class.</p>
      )}
    </div>
  );
};

export default StudentList;
