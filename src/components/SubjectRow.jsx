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
    return (
        <>
            <tr className="tw-border-b tw-border-gray-200">
                <td className="tw-py-2 tw-px-4 tw-text-sm tw-text-gray-900">{subject.name}</td>
                <td className="tw-py-2 tw-px-4 tw-text-sm tw-text-gray-900">
                    <button
                        onClick={() => handleEditSubject(subject)}
                        className="tw-mr-2 tw-px-2 tw-py-1 tw-text-sm tw-font-medium tw-text-white tw-bg-blue-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-blue-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-blue-500"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => handleOpenTutorModal(subject)}
                        className="tw-mr-2 tw-px-2 tw-py-1 tw-text-sm tw-font-medium tw-text-white tw-bg-indigo-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-indigo-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-indigo-500"
                    >
                        Add Tutors
                    </button>
                    <button
                        onClick={() => confirmDeleteSubject(subject)}
                        className="tw-px-2 tw-py-1 tw-text-sm tw-font-medium tw-text-white tw-bg-red-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-red-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-red-500"
                    >
                        Delete
                    </button>
                    <button
                        onClick={() => handleExpandSubject(subject)}
                        className="tw-ml-2 tw-px-2 tw-py-1 tw-text-sm tw-font-medium tw-text-white tw-bg-gray-600 tw-border tw-border-transparent tw-rounded-md hover:tw-bg-gray-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-gray-500"
                    >
                        {expandedSubject === subject.id ? 'Collapse' : 'Expand'}
                    </button>
                </td>
            </tr>
            {expandedSubject === subject.id && (
                <tr>
                    <td colSpan="2" className="tw-py-2 tw-px-4">
                        <div className="tw-max-h-60 tw-overflow-y-auto">
                            <TutorList subject={subject} confirmRemoveTutor={confirmRemoveTutor} />
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};

export default SubjectRow;
