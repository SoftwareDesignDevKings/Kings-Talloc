import React from 'react';

const TutorList = ({ subject, confirmRemoveTutor }) => {
    return (
        <div className="mt-3">
            <h3 className="fs-5 fw-medium text-primary">Tutors</h3>
            {subject.tutors && subject.tutors.length > 0 ? (
                <ul className="list-group mt-2">
                    {subject.tutors.map((tutor) => (
                        <li
                            key={tutor.email}
                            className="list-group-item d-flex justify-content-between align-items-center"
                        >
                            <span>
                                {tutor.name ? `${tutor.name} (${tutor.email})` : tutor.email}
                            </span>
                            <button
                                onClick={() => confirmRemoveTutor(tutor, subject)}
                                className="btn btn-sm btn-danger"
                            >
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-muted">No tutors added to this subject.</p>
            )}
        </div>
    );
};

export default TutorList;
