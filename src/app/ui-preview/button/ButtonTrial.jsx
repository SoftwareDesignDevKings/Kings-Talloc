'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/untitled/button';
import styles from './trial.module.css';

const sampleStudents = [
    { name: 'Jane Student', email: 'jane@example.edu' },
    { name: 'Alex Student', email: 'alex@example.edu' },
];

function RosterExample({ untitled = false }) {
    const [expanded, setExpanded] = useState(false);
    const id = untitled ? 'untitled-sample-roster' : 'current-sample-roster';
    const label = expanded ? 'Collapse' : 'Expand Students';
    const accessibility = { 'aria-expanded': expanded, 'aria-controls': id };

    return (
        <section className={styles.example} aria-label={untitled ? 'Untitled button example' : 'Current button example'}>
            <h3 className={styles.exampleTitle}>{untitled ? 'Untitled button' : 'Current button'}</h3>
            <div className={styles.course}>
                <strong>Mathematics Year 10</strong>
                <span>MATH10 · 2 students</span>
            </div>
            {untitled ? (
                <Button color="secondary" size="sm" onPress={() => setExpanded(value => !value)} {...accessibility}>
                    {label}
                </Button>
            ) : (
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setExpanded(value => !value)} {...accessibility}>
                    {label}
                </button>
            )}
            <p className={styles.status} role="status">{expanded ? '2 students visible' : 'Roster hidden'}</p>
            <div id={id} hidden={!expanded} className={styles.roster} role="region" aria-label="Sample students">
                {sampleStudents.map(student => (
                    <div key={student.email} className={styles.student}>
                        <strong>{student.name}</strong>
                        <span>{student.email}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}

export default function ButtonTrial() {
    return (
        <div className={styles.page}>
            <h2 className={styles.title}>Canvas Classes button preview</h2>
            <p className={styles.intro}>Compare the buttons below. Each opens the same sample roster independently.</p>
            <div className={styles.comparison}>
                <RosterExample />
                <RosterExample untitled />
            </div>
            <p className={styles.help}>Try clicking, then use Tab to focus a button and Enter or Space to open and close the roster.</p>
            <p className={styles.help}>This preview uses sample students. The existing Classes screen is unchanged.</p>
            <Link href="/classes">Open Canvas Classes</Link>
        </div>
    );
}
