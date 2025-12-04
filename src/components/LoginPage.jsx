'use client';

import React from 'react';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { FcGoogle, SiMicrosoft } from '@/components/icons';

export default function LoginPage() {
    return (
        <div className="tw-flex tw-items-center tw-justify-center tw-min-h-screen tw-bg-gradient-to-r tw-from-indigo-500 tw-via-purple-500 tw-to-pink-500">
            <div className="tw-w-full tw-max-w-md tw-p-8 tw-space-y-0 tw-bg-white tw-rounded-lg tw-shadow-lg">
                <div className="tw-flex tw-justify-center">
                    <Image
                        src="/logo.png"
                        alt="Logo"
                        width={200}
                        height={200}
                        className="rounded"
                    />
                </div>
                <div className="tw-text-center">
                    <h2 className="tw-text-3xl tw-font-extrabold tw-text-gray-900">
                        You are not logged in
                    </h2>
                    <p className="tw-mt-2 tw-text-sm tw-text-gray-600">
                        Please sign in to access the dashboard
                    </p>
                </div>
                <div className="tw-space-y-3" style={{ marginTop: '1rem' }}>

                    <button
                        onClick={() => signIn('azure-ad', { callbackUrl: '/dashboard' })}
                        className="tw-relative tw-flex tw-justify-center tw-items-center tw-w-full tw-px-4 tw-py-2 tw-text-base tw-font-medium tw-text-white tw-bg-blue-600 tw-border tw-border-transparent tw-rounded-md tw-group hover:tw-bg-blue-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-blue-500"
                    >
                        <SiMicrosoft className="tw-w-4 tw-h-4 tw-mr-2" />
                        Sign in with Microsoft SSO
                    </button>
                </div>
            </div>
        </div>
    );
}
