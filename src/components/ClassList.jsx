'use client';

import React, { useMemo, useState } from 'react';
import ClassRow from './ClassRow.jsx';
import useToggleSet from '@/hooks/useToggleSet';
import { useAppData } from '@/contexts/AppDataContext';
import t from '@/styles/manageTable.module.css';

const ClassList = () => {
    const { classes } = useAppData();
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedClasses, toggleExpandedClass] = useToggleSet();

    const filteredClasses = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();
        if (!search) return classes;
        return classes.filter((cls) =>
            [cls.name, cls.courseCode]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(search)),
        );
    }, [classes, searchTerm]);

    return (
        <div className={t.container}>
            <h2 className="h4 mb-3 fw-bold text-tks-secondary">Canvas Classes</h2>

            <div className={t.headerActions}>
                <div className={t.searchWrapper}>
                    <input
                        type="text"
                        placeholder="Search by Canvas class or code"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-control"
                    />
                </div>
            </div>

            <div className={t.tableWrap}>
                <table className={`table table-hover mb-0 ${t.table}`} style={{ tableLayout: 'fixed' }}>
                    <thead>
                        <tr>
                            <th scope="col">Class Name</th>
                            <th scope="col" style={{ width: '18%' }}>Code</th>
                            <th scope="col" style={{ width: '14%' }}>Students</th>
                            <th scope="col" style={{ width: '18%', textAlign: 'right' }} className={t.actionCol}><span className="visually-hidden">Actions</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClasses.map((cls) => (
                            <ClassRow
                                key={cls.id}
                                cls={cls}
                                expandedClasses={expandedClasses}
                                handleExpandClass={() => toggleExpandedClass(cls.id)}
                            />
                        ))}
                        {filteredClasses.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-muted text-center py-4">
                                    No Canvas classes synced yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ClassList;
