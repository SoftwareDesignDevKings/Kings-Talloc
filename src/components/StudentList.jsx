import React from 'react';
import t from '@/styles/manageTable.module.css';

const StudentList = ({ cls, confirmRemoveStudent }) => {
    return (
        <div>
            <p className={t.expandLabel}>
                Students{cls.students?.length ? ` (${cls.students.length})` : ''}
            </p>
            {cls.students && cls.students.length > 0 ? (
                <div className={t.memberList}>
                    {cls.students.map((student) => (
                        <div key={student.email} className={t.memberItem}>
                            <div>
                                <div className={t.memberName}>{student.name || 'No name'}</div>
                                <div className={t.memberEmail}>{student.email}</div>
                            </div>
                            <button
                                onClick={() => confirmRemoveStudent(cls, student)}
                                className="btn btn-sm btn-link text-danger text-decoration-none p-0"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className={t.emptyMessage}>No students added to this class yet.</p>
            )}
        </div>
    );
};

export default StudentList;
