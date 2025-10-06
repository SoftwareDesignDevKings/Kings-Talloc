import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import LoginPage from '@components/LoginPage.jsx';

export default async function Login() {
  const session = await getServerSession();

  if (session) {
    redirect('/dashboard');
  }

  return <LoginPage />;
}
