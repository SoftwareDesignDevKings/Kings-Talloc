/** @jest-environment node */

jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }));
jest.mock('@/lib/security/securityWrappers', () => ({
    implementCspWrapper: jest.fn(async () => ({ kind: 'next' })),
    implementRateLimiterWrapper: jest.fn(async () => null),
}));
jest.mock('next/server', () => ({
    NextResponse: { redirect: jest.fn(url => ({ kind: 'redirect', to: new URL(url).pathname })) },
}));

const { getToken } = require('next-auth/jwt');
const { implementRateLimiterWrapper } = require('@/lib/security/securityWrappers');
const { middleware, config } = require('@/middleware');

const request = pathname => ({ nextUrl: { pathname }, url: `https://talloc.test${pathname}` });
const account = (defaultRole, userRoles = []) => ({ email: `${defaultRole}@school.test`, defaultRole, userRoles, accountValid: true });
const visit = async (pathname, token) => {
    getToken.mockResolvedValue(token);
    return middleware(request(pathname));
};

describe('middleware', () => {
    const originalSecret = process.env.NEXTAUTH_SECRET;
    beforeEach(() => { jest.clearAllMocks(); process.env.NEXTAUTH_SECRET = 'test-secret'; });
    afterAll(() => { process.env.NEXTAUTH_SECRET = originalSecret; });

    it.each(['/', '/login', '/api/auth/session'])('serves public path %s without reading a session', async (pathname) => {
        await expect(visit(pathname, null)).resolves.toEqual({ kind: 'next' });
        expect(getToken).not.toHaveBeenCalled();
    });

    it('covers the public entry pages so they get the security headers', () => {
        expect(config.matcher).toEqual(expect.arrayContaining(['/', '/login', '/api/:path*']));
    });

    it.each([
        ['no session', null],
        ['a revoked account', { ...account('admin'), accountValid: false }],
    ])('sends %s to sign in and counts it per address', async (_label, token) => {
        await expect(visit('/dashboard', token)).resolves.toEqual({ kind: 'redirect', to: '/login' });
        expect(implementRateLimiterWrapper).toHaveBeenCalledWith(expect.anything(), '/dashboard', null);
    });

    it('counts a signed-in request against its own account', async () => {
        await expect(visit('/api/scheduling', account('student'))).resolves.toEqual({ kind: 'next' });
        expect(implementRateLimiterWrapper).toHaveBeenCalledWith(expect.anything(), '/api/scheduling', 'student@school.test');
    });

    it('returns the rate limiter\'s response before any page is served', async () => {
        implementRateLimiterWrapper.mockResolvedValueOnce({ kind: 'limited' });
        await expect(visit('/dashboard', account('student'))).resolves.toEqual({ kind: 'limited' });
    });

    it.each([
        ['student', [], '/userRoles', false],
        ['student', [], '/admin/canvas', false],
        ['student', [], '/classes', false],
        ['student', [], '/tutorHours', false],
        ['student', [], '/calendar', true],
        ['tutor', [], '/tutorHours', true],
        ['tutor', [], '/classes', false],
        ['coach', [], '/tutorHours', true],
        ['coach', [], '/userRoles', false],
        ['teacher', [], '/classes', true],
        ['teacher', [], '/tutorHours', true],
        ['teacher', [], '/userRoles', false],
        ['teacher', [], '/admin/canvas', false],
        ['admin', [], '/userRoles', true],
        ['admin', [], '/admin/canvas', true],
        ['tutor', ['admin'], '/userRoles', true],
        ['student', ['teacher'], '/classes', true],
    ])('%s with extra roles %j opening %s: allowed %s', async (defaultRole, userRoles, pathname, allowed) => {
        await expect(visit(pathname, account(defaultRole, userRoles))).resolves.toEqual(
            allowed ? { kind: 'next' } : { kind: 'redirect', to: '/dashboard' },
        );
    });
});
