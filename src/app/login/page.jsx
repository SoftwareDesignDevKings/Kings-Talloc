import React from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Login from '@/components/Login.jsx';

const LoginPage = async () => {
    const session = await getServerSession();
    if (session) {
        redirect('/dashboard');
    }

    return (
        <Login />
    );
}

export default LoginPage