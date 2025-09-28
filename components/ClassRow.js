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
      <tr className="tw-border-b tw-border-gray-200">
        <td className="tw-py-2 tw-px-4 tw-text-sm tw-text-gray-900">{cls.name}</td>
        <td className="tw-py-2 tw-px-4 tw-text-sm tw-text-gray-900">{getSubjectName(cls.subject)}</td>
        <td className="tw-py-2 tw-px-4 tw-text-sm tw-text-gray-900">
          <button
            onClick={() => { handleEditClass(cls); console.log(cls) }}
            className="tw-mr-2 tw-px-2 tw-py-1 tw-text-sm tw-font-medium tw-text-white tw-bg-blue-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-blue-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-blue-500"
          >
            Edit
          </button>
          <button
            onClick={() => handleOpenStudentModal(cls)}
            className="tw-mr-2 tw-px-2 tw-py-1 tw-text-sm tw-font-medium tw-text-white tw-bg-indigo-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-indigo-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-indigo-500"
          >
            Add Students
          </button>
          <button
            onClick={() => confirmDeleteClass(cls)}
            className="tw-px-2 tw-py-1 tw-text-sm tw-font-medium tw-text-white tw-bg-red-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-red-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-red-500"
          >
            Delete
          </button>
          <button
            onClick={() => handleExpandClass(cls)}
            className="tw-ml-2 tw-px-2 tw-py-1 tw-text-sm tw-font-medium tw-text-white tw-bg-gray-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-gray-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-gray-500"
          >
            {expandedClass === cls.id ? 'Collapse' : 'Expand'}
          </button>
        </td>
      </tr>
      {expandedClass === cls.id && (
        <tr>
          <td colSpan="3" className="tw-py-2 tw-px-4">
            <div className="tw-max-h-60 tw-overflow-y-auto">
              <StudentList cls={cls} confirmRemoveStudent={confirmRemoveStudent} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default ClassRow;
