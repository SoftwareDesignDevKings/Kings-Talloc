'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { SiMicrosoft } from '@/components/icons';
import { AppLogin } from '@/lib/security/clientAuth';
import { Button } from '@/components/untitled/button';
import { TableCard } from '@/components/untitled/table-card';
import styles from '@/styles/entryPages.module.css';

// Dev bypass users (matches authOptions.js)
const DEV_USERS = [
    { id: 'dev-mienna', email: 'mienna@kings.edu.au', label: 'Michael (Notifications)'},
    { id: 'dev-computing', email: 'computing@kings.edu.au', label: 'Teacher + Admin'},
    { id: 'dev-tutorAdmin', email: 'tutorAdmin@kings.edu.au', label: 'Tutor + Admin'},
    { id: 'dev-teacher', email: 'teacher@kings.edu.au', label: 'Teacher'},
    { id: 'dev-coachTutor', email: 'coachTutor@kings.edu.au', label: 'Coach + Tutor'},
    { id: 'dev-coach', email: 'coach@kings.edu.au', label: 'Coach'},
    { id: 'dev-tutor', email: 'tutor@kings.edu.au', label: 'Tutor'},
    { id: 'dev-student', email: 'student@kings.edu.au', label: 'Student'}
];

export default function Login() {
    const [isReady, setIsReady] = useState(false);
    useEffect(() => { setIsReady(true); }, []);

    return (
        <div className={styles.page}>
            <div className={styles.login}>
                <div className={`${styles.crest} fade-in`}>
                    <Image
                        src="/TKS-CREST-PMS.svg"
                        alt="The King's School Logo"
                        width={200}
                        height={200}
                        priority
                        unoptimized
                    />
                </div>
                <div className={`${styles.loginIntro} fade-in`} style={{ animationDelay: '100ms' }}>
                    <h1 className={styles.loginTitle}>
                        Kings-Talloc
                    </h1>
                    <p className={styles.loginDescription}>
                        Please sign in to access your dashboard.
                    </p>
                </div>
                <div className="fade-in" style={{ animationDelay: '200ms' }}>
                    {(process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') && (
                        <TableCard.Root className={styles.devPanel}>
                            <p className={styles.devTitle}>Dev Accounts</p>
                            <div className={styles.devAccounts}>
                                {DEV_USERS.map(user => (
                                    <Button
                                        key={user.id}
                                        isDisabled={!isReady}
                                        onClick={() => AppLogin(user.id)}
                                        size="xs"
                                        color="secondary"
                                        className={styles.devButton}
                                    >
                                        {user.label}
                                    </Button>
                                ))}
                            </div>
                        </TableCard.Root>
                    )}
                    <div>
                        <Button
                            isDisabled={!isReady}
                            onClick={() => AppLogin('AZURE')}
                            size="lg"
                            color="primary"
                            className={styles.microsoftButton}
                            iconLeading={<SiMicrosoft size={18} data-icon="leading" aria-hidden="true" />}
                        >
                            Sign in with Microsoft
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
