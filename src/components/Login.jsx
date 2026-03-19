'use client';

import React from 'react';
import Image from 'next/image';
import { FcGoogle, SiMicrosoft } from '@/components/icons';
import { AppLogin } from '@lib/security/auth';

// Dev bypass users (matches authOptions.js)
const DEV_USERS = [
    { id: 'dev-computing', email: 'computing@kings.edu.au', label: '🔧 Admin (Teacher)', variant: 'success' },
    { id: 'dev-tutor', email: 'tutor@kings.edu.au', label: '👨‍🏫 Tutor', variant: 'primary' },
    { id: 'dev-tutorAdmin', email: 'tutorAdmin@kings.edu.au', label: '👨‍🏫 Tutor + Admin', variant: 'info' },
    { id: 'dev-teacher', email: 'teacher@kings.edu.au', label: '📚 Teacher', variant: 'warning' },
    { id: 'dev-coach', email: 'coach@kings.edu.au', label: '⚽ Coach + Tutor', variant: 'secondary' },
    { id: 'dev-student', email: 'student@kings.edu.au', label: '🎓 Student', variant: 'danger' }
];

export default function Login() {
    return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 gradient-background">
            <div className="w-100 p-4 bg-white rounded-3 shadow-lg" style={{ maxWidth: '28rem' }}>
                <div className="d-flex justify-content-center">
                    <Image
                        src="/TKS-CREST-PMS.svg"
                        alt="The King's School Logo"
                        width={275}
                        height={275}
                        className="rounded"
                        priority
                        unoptimized
                    />
                </div>
                <div className="text-center">
                    <h2 className="h2 fw-bolder text-dark">
                        Kings Talloc
                    </h2>
                    <p className="mt-2 text-muted">
                        Please sign in to access the dashboard and calendar.
                    </p>
                </div>
                <div className="mt-3 p-4 bg-warning-subtle border border-warning rounded">
                    <h5 className="text-center mb-3 fw-bold text-dark">
                        Important
                    </h5>
                    <p className="mb-2 small text-dark">
                        You must sign in with <strong>MICROSOFT ONLY</strong> for full functionality.
                        Calendar integration, email features, and other Microsoft services will not work with Google sign-in.
                    </p>
                    <p className="mt-2 mb-0 small text-dark">
                        Google is available for testing purposes only.
                    </p>
                </div>
                <div className="mt-4">
                    {(process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' ) && (
                        <div className="mb-3">
                            <p className="small text-muted mb-2 text-center">Development Bypass Accounts:</p>
                            <div className="d-grid gap-1">
                                {DEV_USERS.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => AppLogin(user.id)}
                                        className={`btn btn-${user.variant} btn-sm`}
                                    >
                                        {user.label}
                                    </button>
                                ))}
                            </div>
                            <hr className="my-3" />
                        </div>
                    )}
                    <button
                        onClick={() => AppLogin('AZURE')}
                        className="btn btn-dark w-100 d-flex align-items-center justify-content-center"
                    >
                        <SiMicrosoft className="me-2" />
                        Sign in with Microsoft SSO
                    </button>
                    <button
                        onClick={() => AppLogin('GOOGLE')}
                        className="btn w-100 d-flex align-items-center justify-content-center mt-2"
                        style={{ backgroundColor: 'white', color: '#202124', border: '1px solid #dadce0' }}
                    >
                        <FcGoogle className="me-2" />
                        Sign in with Google SSO
                    </button>
                </div>
            </div>
        </div>
    );
}
