import React from 'react';
import Link from 'next/link';
import { FiCalendar, FiUserCheck, FiClock, FiBookOpen } from '@/components/icons';

const LandingPage = () => {
    return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 bg-white">
            <div className="mx-auto p-4 p-md-5" style={{ maxWidth: '900px' }}>
                <div className="text-center mb-5 fade-in">
                    <h1 className="display-4 fw-bolder text-dark mb-3" style={{ letterSpacing: '-0.02em' }}>
                        Kings-Talloc
                    </h1>
                    <p className="lead text-muted mx-auto" style={{ maxWidth: '600px' }}>
                        Manage and schedule tutoring sessions effortlessly. Kings-Talloc helps
                        teachers, tutors, and students streamline the process of booking and
                        managing tutoring sessions.
                    </p>
                </div>
                <div className="row row-cols-1 row-cols-md-2 g-4 mt-3 fade-in" style={{ animationDelay: '100ms' }}>
                    <div className="col">
                        <div className="d-flex align-items-start p-4 rounded-3 border bg-light h-100">
                            <FiCalendar className="text-primary me-3 shrink-0" size={32} />
                            <div>
                                <h3 className="h6 fw-bold text-dark mb-2">
                                    Schedule Sessions
                                </h3>
                                <p className="mb-0 text-muted small">
                                    Teachers can easily schedule and manage tutoring sessions for
                                    students.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="d-flex align-items-start p-4 rounded-3 border bg-light h-100">
                            <FiUserCheck className="text-primary me-3 shrink-0" size={32} />
                            <div>
                                <h3 className="h6 fw-bold text-dark mb-2">
                                    Assign Tutors
                                </h3>
                                <p className="mb-0 text-muted small">
                                    Assign the best tutors for each session based on their availability
                                    and expertise.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="d-flex align-items-start p-4 rounded-3 border bg-light h-100">
                            <FiClock className="text-primary me-3 shrink-0" size={32} />
                            <div>
                                <h3 className="h6 fw-bold text-dark mb-2">
                                    Tutor Availability
                                </h3>
                                <p className="mb-0 text-muted small">
                                    Tutors can mark their availability to help teachers and students
                                    plan sessions effectively.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="d-flex align-items-start p-4 rounded-3 border bg-light h-100">
                            <FiBookOpen className="text-primary me-3 shrink-0" size={32} />
                            <div>
                                <h3 className="h6 fw-bold text-dark mb-2">
                                    Manage Classes
                                </h3>
                                <p className="mb-0 text-muted small">
                                    Easily manage and organise classes and group sessions for students.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="text-center mt-5 fade-in" style={{ animationDelay: '200ms' }}>
                    <Link
                        href="/login"
                        prefetch={true}
                        className="btn btn-outline-primary px-5 py-3 rounded-pill fw-medium"
                    >
                        Get Started
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
