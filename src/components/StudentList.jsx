import React from 'react';
import { Button } from '@/components/untitled/button';
import styles from './StudentList.module.css';

const StudentList = ({ cls, confirmRemoveStudent }) => {
    return (
        <div className={styles.roster}>
            <p className={styles.heading}>
                Students{cls.students?.length ? ` (${cls.students.length})` : ''}
            </p>
            {cls.students && cls.students.length > 0 ? (
                <ul className={styles.list} aria-label="Enrolled students">
                    {cls.students.map((student) => (
                        <li key={student.email} className={styles.item}>
                            <div className={styles.identity}>
                                <div className={styles.name}>{student.name || 'No name'}</div>
                                <div className={styles.email}>{student.email}</div>
                            </div>
                            {confirmRemoveStudent && (
                                <Button size="sm" color="secondary-destructive" onClick={() => confirmRemoveStudent(cls, student)}>
                                    Remove
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className={styles.emptyMessage}>No students added to this class yet.</p>
            )}
        </div>
    );
};

export default StudentList;
