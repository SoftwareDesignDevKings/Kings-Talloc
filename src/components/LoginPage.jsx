"use client"; // This directive must be at the top of the file

import React from 'react';
import { Image } from 'react-bootstrap';
import { signIn } from 'next-auth/react';
import { FcGoogle } from '@/components/icons';

export default function LoginPage() {
  return (
    <div className="tw-flex tw-items-center tw-justify-center tw-min-h-screen tw-bg-gradient-to-r tw-from-indigo-500 tw-via-purple-500 tw-to-pink-500">
      <div className="tw-w-full tw-max-w-md tw-p-8 tw-space-y-0 tw-bg-white tw-rounded-lg tw-shadow-lg">
        <div className="tw-flex tw-justify-center">
            <Image src="/logo.png" alt="Logo" width={200} height={200} rounded />
        </div>
        <div className="tw-text-center">
          <h2 className="tw-text-3xl tw-font-extrabold tw-text-gray-900">You are not logged in</h2>
          <p className="tw-mt-2 tw-text-sm tw-text-gray-600">
            Please sign in to access the dashboard
          </p>
        </div>
        <button
          style={{ marginTop: '1rem' }}
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          className="tw-relative tw-flex tw-justify-center tw-items-center tw-w-full tw-px-4 tw-py-2 tw-text-base tw-font-medium tw-text-white tw-bg-indigo-600 tw-border tw-border-transparent tw-rounded-md tw-group hover:tw-bg-indigo-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-indigo-500"
        >
          <FcGoogle className="tw-w-4 tw-h-4 tw-mr-2" />
          Sign in with Google SSO
        </button>
      </div>
    </div>
  );
}
