'use client';

import React from 'react';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { FcGoogle, SiMicrosoft } from '@/components/icons';

export default function Login() {
    return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 gradient-background">
            <div className="w-100 p-4 bg-white rounded-3 shadow-lg" style={{ maxWidth: '28rem' }}>
                <div className="d-flex justify-content-center">
                    <Image
                        src="/logo.png"
                        alt="Logo"
                        width={200}
                        height={200}
                        className="rounded"
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
                <div className="mt-4">
                    <button
                        onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                        className="btn btn-primary w-100 d-flex align-items-center justify-content-center"
                    >
                        <FcGoogle className="me-2" />
                        Sign in with Google SSO
                    </button>

                    <button
                        onClick={() => signIn('azure-ad', { callbackUrl: '/dashboard' })}
                        className="btn btn-secondary w-100 d-flex align-items-center justify-content-center mt-3"
                    >
                        <SiMicrosoft className="me-2" />
                        Sign in with Microsoft SSO
                    </button>
                </div>
            </div>
        </div>
    );
}
