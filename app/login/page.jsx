"use client";

import React, { useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LoadingPage from '@components/LoadingPage'; // Import the LoadingPage component

export default function Login() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      // Redirect to the dashboard if already authenticated
      router.push('/dashboard');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <LoadingPage />; // Use the LoadingPage component
  }

  return (
    <div className="tw-flex tw-items-center tw-justify-center tw-min-h-screen tw-bg-gradient-to-r tw-from-indigo-500 tw-via-purple-500 tw-to-pink-500">
      <div className="tw-w-full tw-max-w-md tw-p-8 tw-space-y-8 tw-bg-white tw-rounded-lg tw-shadow-lg">
        <div className="tw-text-center">
          <h2 className="tw-mt-6 tw-text-3xl tw-font-extrabold tw-text-gray-900">Sign in to your account</h2>
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
