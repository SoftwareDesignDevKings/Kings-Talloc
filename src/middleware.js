import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { implementCspWrapper, implementRateLimiterWrapper } from './lib/security/securityWrappers';

// ===== MAINTENANCE MODE =====
// Set to true to enable maintenance mode (redirects all users to /maintenance)
// Set to false to disable (normal operation)
const MAINTENANCE_MODE = false;
// ============================

const isPublicPath = (pathname) =>
    pathname === '/login' || pathname === '/' || pathname === '/maintenance' || pathname.startsWith('/api/auth');

export async function middleware(req) {

    const { pathname } = req.nextUrl;
    const secret = process.env.NEXTAUTH_SECRET;

    // Read the session before rate limiting so signed-in requests are counted per
    // account. The token is signed with the app secret, so the email cannot be forged.
    const token = !isPublicPath(pathname) && secret ? await getToken({ req, secret }) : null;
    const signedIn = Boolean(token) && token.accountValid !== false;

    if (process.env.NODE_ENV !== 'development') {
        try {
            const rateLimitResponse = await implementRateLimiterWrapper(req, pathname, signedIn ? token.email : null);
            if (rateLimitResponse) {
                return rateLimitResponse;
            }
        } catch (err) {
            console.error('Rate limiter error:', err);
        }
    }


    const response = await implementCspWrapper(req);

    // Maintenance mode  ENABLED - redirect everyone to /maintenance
    if (MAINTENANCE_MODE && pathname !== '/maintenance') {
        return NextResponse.redirect(new URL('/maintenance', req.url));
    }

    // Maintenance mode DISABLED - prevent accidental access to /maintenance
    if (!MAINTENANCE_MODE && pathname === '/maintenance') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // IF PUBLIC ENDPOINT (or redirect on login, no security checks)
    if (isPublicPath(pathname)) {
        return response;
    }

    if (!secret) {
        throw new Error('NEXTAUTH_SECRET is not defined');
    }

    // no valid session: redirect to login page
    if (!signedIn) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    const userRole = token.defaultRole || token.role;
    const userRoles = token.userRoles || [];

    // admin-only routes
    const adminOnlyRoutes = ['/userRoles', '/admin'];
    const isAdminOnlyRoute = adminOnlyRoutes.some(route => pathname.startsWith(route));
    if (isAdminOnlyRoute && userRole !== 'admin' && !userRoles.includes('admin')) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // admin + teacher routes
    const adminTeacherRoutes = ['/classes'];
    const isAdminTeacherRoute = adminTeacherRoutes.some(route => pathname.startsWith(route));
    const isAdminOrTeacher = userRole === 'admin' || userRole === 'teacher' || userRoles.includes('admin') || userRoles.includes('teacher');
    if (isAdminTeacherRoute && !isAdminOrTeacher) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // tutor hours — admin, teacher, tutor and coach routes
    const tutorOnlyRoutes = ['/tutorHours'];
    const isTutorOnlyRoute = tutorOnlyRoutes.some(route => pathname.startsWith(route));
    const canAccessTutorHours = ['admin', 'teacher', 'tutor', 'coach'].includes(userRole) || userRoles.some(r => ['admin', 'teacher', 'tutor', 'coach'].includes(r));
    if (isTutorOnlyRoute && !canAccessTutorHours) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // token exists, allow the request
    return response;
}

// Define the paths that the middleware will apply to
export const config = {
    matcher: [
        // The landing and sign-in pages are public, but still need the security headers.
        '/',
        '/login',
        '/dashboard/:path*',
        '/userRoles/:path*',
        '/calendar/:path*',
        '/classes/:path*',
        '/admin/:path*',
        '/tutorHours/:path*',
        '/maintenance',
        '/api/:path*'
    ]
};
