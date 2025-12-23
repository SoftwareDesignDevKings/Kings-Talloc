import React from 'react';
import { FiCalendar, FiUserCheck, FiClock, FiBookOpen } from '@/components/icons';
import '../../src/app/globals.css'
const LandingPage = () => {
    return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 gradient-background">
            <div className="w-100 container-lg mx-auto p-5 bg-white rounded-3 shadow-lg">
                <div className="text-center mb-5">
                    <h2 className="mt-4 display-4 fw-bolder text-dark">
                        Kings-Talloc
                    </h2>
                    <p className="mt-3 fs-5 text-secondary">
                        Manage and schedule tutoring sessions effortlessly. Kings-Talloc helps
                        teachers, tutors, and students streamline the process of booking and
                        managing educational sessions.
                    </p>
                </div>
                <div className="row row-cols-1 row-cols-md-2 g-5 mt-5">
                    <div className="col">
                        <div className="d-flex align-items-start">
                            <FiCalendar className="text-primary me-3" size={48} />
                            <div>
                                <h3 className="h3 fw-bold text-dark">
                                    Schedule Sessions
                                </h3>
                                <p className="mt-2 text-secondary">
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
                                <h3 className="h3 fw-bold text-dark">
                                    Assign Tutors
                                </h3>
                                <p className="mt-2 text-secondary">
                                    Assign the best tutors for each session based on their availability
                                    and expertise.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="d-flex align-items-start">
                            <FiClock className="text-primary me-3" size={48} />
                            <div>
                                <h3 className="h3 fw-bold text-dark">
                                    Tutor Availability
                                </h3>
                                <p className="mt-2 text-secondary">
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
                                <h3 className="h3 fw-bold text-dark">
                                    Manage Classes
                                </h3>
                                <p className="mt-2 text-secondary">
                                    Easily manage and organise classes and group sessions for students.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="text-center mt-5">
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
