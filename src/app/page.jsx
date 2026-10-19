'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, UserCheck01, Clock, BookOpen01 } from '@untitledui/icons';
import { Button } from '@/components/untitled/button';
import { FeaturedIcon } from '@/components/untitled/featured-icon';
import { TableCard } from '@/components/untitled/table-card';
import styles from '@/styles/entryPages.module.css';

const features = [
    { icon: Calendar, title: 'Schedule Sessions', description: 'Teachers can easily schedule and manage tutoring sessions for students.' },
    { icon: UserCheck01, title: 'Assign Tutors', description: 'Assign the best tutors for each session based on their availability and expertise.' },
    { icon: Clock, title: 'Tutor Availability', description: 'Tutors can mark their availability to help teachers and students plan sessions effectively.' },
    { icon: BookOpen01, title: 'Manage Classes', description: 'Easily manage and organise classes and group sessions for students.' },
];

const LandingPage = () => (
    <div className={styles.page}>
        <div className={styles.landing}>
            <div className={`${styles.intro} fade-in`}>
                <h1 className={styles.landingTitle}>Kings-Talloc</h1>
                <p className={styles.description}>
                    Manage and schedule tutoring sessions effortlessly. Kings-Talloc helps
                    teachers, tutors, and students streamline the process of booking and
                    managing tutoring sessions.
                </p>
            </div>
            <div className={`${styles.features} fade-in`} style={{ animationDelay: '100ms' }}>
                {features.map(({ icon, title, description }) => (
                    <TableCard.Root key={title} className={styles.feature}>
                        <FeaturedIcon size="md" theme="light" color="brand" icon={icon} aria-hidden="true" />
                        <div className={styles.featureText}>
                            <h3 className={styles.featureTitle}>{title}</h3>
                            <p className={styles.featureDescription}>{description}</p>
                        </div>
                    </TableCard.Root>
                ))}
            </div>
            <div className={`${styles.start} fade-in`} style={{ animationDelay: '200ms' }}>
                <Button size="xl" color="primary" href="/login"
                    render={props => <Link {...props} href="/login" prefetch={true} />}>
                    Get Started
                </Button>
            </div>
        </div>
    </div>
);

export default LandingPage;
