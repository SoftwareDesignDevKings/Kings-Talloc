import React from 'react';
import StudentList from './StudentList';

const ClassRow = ({
  cls,
  handleOpenStudentModal,
  confirmDeleteClass,
  handleExpandClass,
  expandedClass,
  confirmRemoveStudent,
  handleEditClass,
  subjects,
}) => {
  const getSubjectName = (subjectId) => {
    const subject = subjects.find((subject) => subject.id === subjectId);
    return subject ? subject.name : 'No Subject';
  };

  return (
    <>
      <tr className="border-b border-gray-200">
        <td className="py-2 px-4 text-sm text-gray-900">{cls.name}</td>
        <td className="py-2 px-4 text-sm text-gray-900">{getSubjectName(cls.subject)}</td>
        <td className="py-2 px-4 text-sm text-gray-900">
          <button
            onClick={() => { handleEditClass(cls); console.log(cls) }}
            className="mr-2 px-2 py-1 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Edit
          </button>
          <button
            onClick={() => handleOpenStudentModal(cls)}
            className="mr-2 px-2 py-1 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Students
          </button>
          <button
            onClick={() => confirmDeleteClass(cls)}
            className="px-2 py-1 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete
          </button>
          <button
            onClick={() => handleExpandClass(cls)}
            className="ml-2 px-2 py-1 text-sm font-medium text-white bg-gray-600 border border-transparent rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            {expandedClass === cls.id ? 'Collapse' : 'Expand'}
          </button>
        </td>
      </tr>
      {expandedClass === cls.id && (
        <tr>
          <td colSpan="3" className="py-2 px-4">
            <div className="max-h-60 overflow-y-auto">
              <StudentList cls={cls} confirmRemoveStudent={confirmRemoveStudent} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default ClassRow;
