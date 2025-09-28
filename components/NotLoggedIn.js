"use client"; // This directive must be at the top of the file

import React from 'react';
import { signIn } from 'next-auth/react';

export default function NotLoggedIn() {
  return (
    <div className="tw-flex tw-items-center tw-justify-center tw-min-h-screen tw-bg-gradient-to-r tw-from-indigo-500 tw-via-purple-500 tw-to-pink-500">
      <div className="tw-w-full tw-max-w-md tw-p-8 tw-space-y-8 tw-bg-white tw-rounded-lg tw-shadow-lg">
        <div className="tw-flex tw-justify-center">
          <img className="tw-w-20 tw-h-20" src="/logo.svg" alt="Logo" />
        </div>
        <div className="tw-text-center">
          <h2 className="tw-mt-6 tw-text-3xl tw-font-extrabold tw-text-gray-900">You are not logged in</h2>
          <p className="tw-mt-2 tw-text-sm tw-text-gray-600">
            Please sign in to access the dashboard
          </p>
        </div>
        <button
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          className="tw-relative tw-flex tw-justify-center tw-w-full tw-px-4 tw-py-2 tw-text-sm tw-font-medium tw-text-white tw-bg-indigo-600 tw-border tw-border-transparent tw-rounded-md tw-group hover:tw-bg-indigo-700 focus:tw-outline-none focus:tw-ring-2 focus:tw-ring-offset-2 focus:tw-ring-indigo-500"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
