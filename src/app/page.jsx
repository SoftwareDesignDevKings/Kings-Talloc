import React from 'react';
import { FiCalendar, FiUserCheck, FiClock, FiBookOpen } from '@/components/icons';
import '../../src/app/globals.css'
const LandingPage = () => {
    return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 gradient-background">
            <div className="mx-auto p-5 bg-white rounded-3 shadow-lg" style={{ maxWidth: '900px' }}>
                <div className="text-center mb-3">
                    <h4 className="mt-3 display-5 fw-bolder text-dark">
                        Kings-Talloc
                    </h4>
                    <p className="mt-2 text-secondary">
                        Manage and schedule tutoring sessions effortlessly. Kings-Talloc helps
                        teachers, tutors, and students streamline the process of booking and
                        managing tutoring sessions.
                    </p>
                </div>
                <div className="row row-cols-1 row-cols-md-2 g-3 mt-3">
                    <div className="col">
                        <div className="d-flex align-items-start">
                            <FiCalendar className="text-primary me-3" size={48} />
                            <div>
                                <h3 className="h5 fw-bold text-dark">
                                    Schedule Sessions
                                </h3>
                                <p className="mt-1 text-secondary">
                                    Teachers can easily schedule and manage tutoring sessions for
                                    students.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="d-flex align-items-start">
                            <FiUserCheck className="text-primary me-3" size={48} />
                            <div>
                                <h3 className="h5 fw-bold text-dark">
                                    Assign Tutors
                                </h3>
                                <p className="mt-1 text-secondary">
                                    Assign the best tutors for each session based on their availability
                                    and expertise.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="d-flex align-items-start">
                            <FiClock className="text-primary me-3" size={55} />
                            <div>
                                <h3 className="h5 fw-bold text-dark">
                                    Tutor Availability
                                </h3>
                                <p className="mt-1 text-secondary">
                                    Tutors can mark their availability to help teachers and students
                                    plan sessions effectively.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="d-flex align-items-start">
                            <FiBookOpen className="text-primary me-3" size={48} />
                            <div>
                                <h3 className="h5 fw-bold text-dark">
                                    Manage Classes
                                </h3>
                                <p className="mt-1 text-secondary">
                                    Easily manage and organise classes and group sessions for students.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="text-center mt-3">
                    <a
                        className="btn btn-primary btn-lg"
                        href="/login"
                    >
                        Get Started
                    </a>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
