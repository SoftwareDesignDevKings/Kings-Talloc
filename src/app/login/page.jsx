import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Login from '@/components/Login.jsx';
import { authOptions } from '@/lib/security/authConfig';

const LoginPage = async () => {
    const session = await getServerSession(authOptions);
    if (session?.user) {
        redirect('/dashboard');
    }

    return (
        <Login />
    );
}

export default LoginPage