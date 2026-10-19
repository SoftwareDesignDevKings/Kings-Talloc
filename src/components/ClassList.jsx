'use client';

import React, { useMemo, useState } from 'react';
import LoadingSkeleton from './LoadingSkeleton';
import ClassRow from './ClassRow.jsx';
import useToggleSet from '@/hooks/useToggleSet';
import { useAppData } from '@/contexts/AppDataContext';
import { SearchLg } from '@untitledui/icons';
import { Input } from '@/components/untitled/input';
import { TableCard } from '@/components/untitled/table-card';
import t from '@/styles/manageTable.module.css';
import styles from './ClassList.module.css';

const ClassList = () => {
    const { classes, classesLoading = false } = useAppData();
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
                <div className={`${t.searchWrapper} ${styles.searchWrapper}`}>
                    <Input
                        type="text"
                        size="md"
                        icon={SearchLg}
                        aria-label="Search Canvas classes"
                        placeholder="Search by Canvas class or code"
                        value={searchTerm}
                        onChange={setSearchTerm}
                    />
                </div>
            </div>

            <TableCard.Root size="sm" className={styles.tableCard}>
                <div className={styles.tableScroll} role="region" aria-label="Canvas classes table" tabIndex={0}>
                    <table className={styles.table} aria-busy={classesLoading}>
                        <thead>
                            <tr>
                                <th scope="col">Class Name</th>
                                <th scope="col">Code</th>
                                <th scope="col">Students</th>
                                <th scope="col" className={styles.actions}><span className="visually-hidden">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {!classesLoading && filteredClasses.map((cls) => (
                                <ClassRow
                                    key={cls.id}
                                    cls={cls}
                                    expandedClasses={expandedClasses}
                                    handleExpandClass={() => toggleExpandedClass(cls.id)}
                                />
                            ))}
                            {classesLoading && <tr aria-hidden="true">{[0, 1, 2, 3].map(column => <td key={column}><LoadingSkeleton width="70%" /></td>)}</tr>}
                            {!classesLoading && filteredClasses.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-muted text-center py-4">
                                        No Canvas classes synced yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <p className={styles.scrollHint}>Scroll sideways to see all columns.</p>
            </TableCard.Root>
        </div>
    );
};

export default ClassList;
