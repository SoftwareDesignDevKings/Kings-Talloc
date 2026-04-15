'use client';

import React from 'react';
import Image from 'next/image';
import { FcGoogle, SiMicrosoft } from '@/components/icons';
import { AppLogin } from '@/lib/security/clientAuth';

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
        <div className="d-flex align-items-center justify-content-center min-vh-100 bg-white">
            <div className="w-100 p-4 p-md-5" style={{ maxWidth: '400px' }}>
                <div className="d-flex justify-content-center mb-4 fade-in">
                    <Image
                        src="/TKS-CREST-PMS.svg"
                        alt="The King's School Logo"
                        width={200}
                        height={200}
                        priority
                    />
                </div>
                <div className="text-center mb-4 fade-in" style={{ animationDelay: '100ms' }}>
                    <h1 className="h3 fw-bolder text-dark mb-2" style={{ letterSpacing: '-0.02em' }}>
                        Kings-Talloc
                    </h1>
                    <p className="text-muted small">
                        Please sign in to access your dashboard.
                    </p>
                </div>
                <div className="fade-in" style={{ animationDelay: '200ms' }}>
                    <div className="p-3 mb-4 bg-light rounded-3 border">
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <span className="badge bg-dark">Notice</span>
                        </div>
                        <p className="mb-0 small text-muted">
                            You must sign in with <strong>Microsoft</strong> for full calendar and email integration functionality. Google sign-in is for testing only.
                        </p>
                    </div>
                    
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mb-4 p-3 border rounded-3 bg-light">
                            <p className="small fw-bold text-muted mb-3 text-uppercase" style={{ letterSpacing: '0.05em' }}>Dev Accounts</p>
                            <div className="d-flex flex-wrap gap-2">
                                {DEV_BYPASS_USERS.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => signIn(user.id, { callbackUrl: '/dashboard' })}
                                        className={`btn btn-outline-${user.variant} btn-sm grow text-xs`}
                                    >
                                        {user.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="d-flex flex-column gap-3">
                        <button
                            onClick={() => signIn('azure-ad', { callbackUrl: '/dashboard' })}
                            className="btn btn-dark w-100 d-flex align-items-center justify-content-center gap-2 py-2"
                            style={{ minHeight: '44px' }}
                        >
                            <SiMicrosoft size={18} />
                            <span className="fw-medium">Sign in with Microsoft</span>
                        </button>
                        <button
                            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                            className="btn btn-light w-100 d-flex align-items-center justify-content-center gap-2 py-2 border"
                            style={{ minHeight: '44px' }}
                        >
                            <FcGoogle size={18} />
                            <span className="fw-medium text-dark">Sign in with Google</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
