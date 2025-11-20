import React from 'react';

const TutorList = ({ subject, confirmRemoveTutor }) => {
    return (
        <div className="tw-mt-4">
            <h3 className="tw-text-lg tw-font-medium tw-text-indigo-600">Tutors</h3>
            {subject.tutors && subject.tutors.length > 0 ? (
                <ul className="tw-mt-2">
                    {subject.tutors.map((tutor) => (
                        <li
                            key={tutor.email}
                            className="tw-flex tw-justify-between tw-items-center tw-py-2 tw-px-4 tw-border tw-rounded-md tw-mb-2 tw-bg-gray-50"
                        >
                            <span>
                                {tutor.name ? `${tutor.name} (${tutor.email})` : tutor.email}
                            </span>
                            <button
                                onClick={() => confirmRemoveTutor(tutor, subject)}
                                className="tw-text-red-600 hover:tw-text-red-800 focus:tw-outline-none"
                            >
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="tw-text-sm tw-text-gray-600">No tutors added to this subject.</p>
            )}
        </div>
    );
};

export default TutorList;
