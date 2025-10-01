"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import LoadingPage from '@components/LoadingPage.jsx';
import LoginPage from '@components/LoginPage.jsx';

export default function Login() {
  const { _, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return <LoadingPage />;
  }

  if (status === "authenticated") {
    router.push("/dashboard");
  }

  return <LoginPage />;
}
