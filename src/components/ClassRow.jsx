import React from 'react';
import StudentList from './StudentList.jsx';
import { Button } from '@/components/untitled/button';
import { FiChevronDown, FiChevronRight } from '@/components/icons';
import t from '@/styles/manageTable.module.css';
import styles from './ClassRow.module.css';

const ClassRow = ({
    cls,
    expandedClasses,
    handleExpandClass,
}) => {
    const isExpanded = expandedClasses.has(cls.id);
    const collapseId = `class-collapse-${cls.id}`;
    const studentCount = cls.students?.length || 0;
    const toggleLabel = `${isExpanded ? 'Hide' : 'Show'} students in ${cls.name}`;

    return (
        <>
            <tr>
                <td>{cls.name}</td>
                <td>{cls.courseCode || 'No code'}</td>
                <td data-unit={studentCount === 1 ? ' student' : ' students'}>{studentCount}</td>
                <td className={t.actionCol} style={{ textAlign: 'right' }}>
                    <div className={t.actionGroup} style={{ justifyContent: 'flex-end' }}>
                        <Button
                            color="tertiary"
                            size="sm"
                            iconLeading={isExpanded
                                ? <FiChevronDown data-icon aria-hidden="true" />
                                : <FiChevronRight data-icon aria-hidden="true" />}
                            onPress={handleExpandClass}
                            aria-label={toggleLabel}
                            title={toggleLabel}
                            aria-expanded={isExpanded}
                            aria-controls={collapseId}
                        />
                    </div>
                </td>
            </tr>
            <tr className={t.expandRow} data-canvas-roster-row>
                <td colSpan={4}>
                    <div
                        id={collapseId}
                        role="region"
                        aria-label={`Students in ${cls.name}`}
                        hidden={!isExpanded}
                        tabIndex={0}
                        className={styles.rosterRegion}
                    >
                        <StudentList cls={cls} />
                    </div>
                </td>
            </tr>
        </>
    );
};

export default ClassRow;
