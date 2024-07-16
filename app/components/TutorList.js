import React from 'react';

const TutorList = ({ subject, confirmRemoveTutor }) => {
  return (
    <div className="mt-4">
      <h3 className="text-lg font-medium text-indigo-600">Tutors</h3>
      {subject.tutors && subject.tutors.length > 0 ? (
        <ul className="mt-2">
          {subject.tutors.map(tutor => (
            <li
              key={tutor.email}
              className="flex justify-between items-center py-2 px-4 border rounded-md mb-2 bg-gray-50"
            >
              <span>{tutor.name ? `${tutor.name} (${tutor.email})` : tutor.email}</span>
              <button
                onClick={() => confirmRemoveTutor(tutor, subject)}
                className="text-red-600 hover:text-red-800 focus:outline-none"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-600">No tutors added to this subject.</p>
      )}
    </div>
  );
};

export default TutorList;
