import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Login from '@/components/Login';
import LandingPage from '@/app/page';
import LoginPage from '@/app/login/page';
import { AppLogin } from '@/lib/security/clientAuth';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

jest.mock('@/lib/security/clientAuth', () => ({ AppLogin: jest.fn() }));
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/lib/security/authConfig', () => ({ authOptions: {} }));
jest.mock('next/headers', () => ({ headers: jest.fn(async () => new Headers()), cookies: jest.fn(async () => ({ getAll: () => [] })) }));
jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('next/link', () => {
    const React = require('react');
    return { __esModule: true, default: React.forwardRef(function MockLink(props, ref) {
        return <a ref={ref} href={props.href} className={props.className} onClick={props.onClick}>{props.children}</a>;
    }) };
});
const accounts = [
    ['Michael (Notifications)', 'dev-mienna'], ['Teacher + Admin', 'dev-computing'],
    ['Tutor + Admin', 'dev-tutorAdmin'], ['Teacher', 'dev-teacher'],
    ['Coach + Tutor', 'dev-coachTutor'], ['Coach', 'dev-coach'],
    ['Tutor', 'dev-tutor'], ['Student', 'dev-student'],
];
beforeEach(() => jest.clearAllMocks());
afterEach(cleanup);

test.each(accounts)('%s keeps its existing development sign-in provider', (label, provider) => {
    render(<Login />);
    fireEvent.click(screen.getByRole('button', { name: label, exact: true }));
    expect(AppLogin).toHaveBeenCalledTimes(1);
    expect(AppLogin).toHaveBeenCalledWith(provider);
});
test('Microsoft button preserves its provider, branding and existing copy', () => {
    render(<Login />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Microsoft', exact: true }));
    expect(AppLogin).toHaveBeenCalledWith('AZURE');
    expect(screen.getByRole('img', { name: "The King's School Logo" })).toHaveAttribute('src', '/TKS-CREST-PMS.svg');
    expect(screen.getByRole('heading', { name: 'Kings-Talloc', exact: true })).toBeInTheDocument();
    expect(screen.getByText('Please sign in to access your dashboard.')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(9);
});
test('landing page keeps its four features, descriptions and Get Started destination', () => {
    render(<LandingPage />);
    expect(screen.getAllByRole('heading').map(el => el.textContent.trim())).toEqual([
        'Kings-Talloc', 'Schedule Sessions', 'Assign Tutors', 'Tutor Availability', 'Manage Classes',
    ]);
    for (const text of [
        'Manage and schedule tutoring sessions effortlessly. Kings-Talloc helps teachers, tutors, and students streamline the process of booking and managing tutoring sessions.',
        'Teachers can easily schedule and manage tutoring sessions for students.',
        'Assign the best tutors for each session based on their availability and expertise.',
        'Tutors can mark their availability to help teachers and students plan sessions effectively.',
        'Easily manage and organise classes and group sessions for students.',
    ]) expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get Started', exact: true })).toHaveAttribute('href', '/login');
});
test('login route renders sign-in for anonymous and revoked sessions', async () => {
    getServerSession.mockResolvedValue(null); render(await LoginPage());
    expect(screen.getByRole('button', { name: 'Sign in with Microsoft' })).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
});
test('login route redirects a valid signed-in account', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'teacher@kings.edu.au' } });
    redirect.mockImplementation(() => { throw new Error('redirect:/dashboard'); });
    await expect(LoginPage()).rejects.toThrow('redirect:/dashboard');
});
