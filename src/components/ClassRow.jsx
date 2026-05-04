import React from 'react';
import StudentList from './StudentList.jsx';
import t from '@/styles/manageTable.module.css';

const ClassRow = ({
    cls,
    expandedClasses,
    handleExpandClass,
}) => {
    const isExpanded = expandedClasses.has(cls.id);
    const collapseId = `class-collapse-${cls.id}`;
    const studentCount = cls.students?.length || 0;

    return (
        <>
            <tr>
                <td>{cls.name}</td>
                <td>{cls.courseCode || 'No code'}</td>
                <td>{studentCount}</td>
                <td className={t.actionCol} style={{ textAlign: 'right' }}>
                    <div className={t.actionGroup} style={{ justifyContent: 'flex-end' }}>
                        <button
                            onClick={handleExpandClass}
                            className="btn btn-sm btn-outline-secondary"
                            aria-expanded={isExpanded}
                            aria-controls={collapseId}
                        >
                            {isExpanded ? 'Collapse' : 'Expand Students'}
                        </button>
                    </div>
                </td>
            </tr>
            <tr className={t.expandRow}>
                <td colSpan={4}>
                    <div
                        id={collapseId}
                        role="region"
                        aria-label={`Students in ${cls.name}`}
                        className={`collapse${isExpanded ? ' show' : ''}`}
                    >
                        <div className={t.expandPanel}>
                            <div className={t.expandPanelInner}>
                                <StudentList cls={cls} />
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        </>
    );
};

export default ClassRow;
