import React from 'react';
import t from '@/styles/manageTable.module.css';

const TutorList = ({ subject, confirmRemoveTutor }) => {
    return (
        <div>
            <p className={t.expandLabel}>
                Tutors{subject.tutors?.length ? ` (${subject.tutors.length})` : ''}
            </p>
            {subject.tutors && subject.tutors.length > 0 ? (
                <div className={t.memberList}>
                    {subject.tutors.map((tutor) => (
                        <div key={tutor.email} className={t.memberItem}>
                            <div>
                                <div className={t.memberName}>{tutor.name || 'No name'}</div>
                                <div className={t.memberEmail}>{tutor.email}</div>
                            </div>
                            <button
                                onClick={() => confirmRemoveTutor(tutor, subject)}
                                className="btn btn-sm btn-outline-danger"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className={t.emptyMessage}>No tutors added to this subject yet.</p>
            )}
        </div>
    );
};

export default TutorList;
