import React from 'react';
import TutorList from './TutorList';

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
      <tr className="border-b border-gray-200">
        <td className="py-2 px-4 text-sm text-gray-900">{subject.name}</td>
        <td className="py-2 px-4 text-sm text-gray-900">
          <button
            onClick={() => handleEditSubject(subject)}
            className="mr-2 px-2 py-1 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Edit
          </button>
          <button
            onClick={() => handleOpenTutorModal(subject)}
            className="mr-2 px-2 py-1 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Add Tutors
          </button>
          <button
            onClick={() => confirmDeleteSubject(subject)}
            className="px-2 py-1 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete
          </button>
          <button
            onClick={() => handleExpandSubject(subject)}
            className="ml-2 px-2 py-1 text-sm font-medium text-white bg-gray-600 border border-transparent rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            {expandedSubject === subject.id ? 'Collapse' : 'Expand'}
          </button>
        </td>
      </tr>
      {expandedSubject === subject.id && (
        <tr>
          <td colSpan="2" className="py-2 px-4">
            <TutorList subject={subject} confirmRemoveTutor={confirmRemoveTutor} />
          </td>
        </tr>
      )}
    </>
  );
};

export default SubjectRow;
