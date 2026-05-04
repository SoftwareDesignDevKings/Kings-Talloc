import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

import { implementCspWrapper, implementRateLimiterWrapper } from './lib/security/securityWrappers';

// ===== MAINTENANCE MODE =====
// Set to true to enable maintenance mode (redirects all users to /maintenance)
// Set to false to disable (normal operation)
const MAINTENANCE_MODE = false;
// ============================

export async function middleware(req) {

    const { pathname } = req.nextUrl;
    const response = await implementCspWrapper(req);
    if (process.env.NODE_ENV === 'production') {
        try {
            const rateLimitResponse = await implementRateLimiterWrapper(req, pathname);
            if (rateLimitResponse) {
                response.headers.forEach((value, key) => {
                    if (!rateLimitResponse.headers.has(key)) {
                        rateLimitResponse.headers.set(key, value);
                    }
                });
                return rateLimitResponse;
            }
        } catch (err) {
            console.error('Rate limiter error:', err);
        }
    }

    // Maintenance mode  ENABLED - redirect everyone to /maintenance
    if (MAINTENANCE_MODE && pathname !== '/maintenance') {
        return NextResponse.redirect(new URL('/maintenance', req.url));
    }

    // Maintenance mode DISABLED - prevent accidental access to /maintenance
    if (!MAINTENANCE_MODE && pathname === '/maintenance') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // IF PUBLIC ENDPOINT (or redirect on login, no security checks)
    const publicExactPaths = ['/login', '/', '/maintenance'];
    const publicPathPrefixes = ['/api/auth'];
    const isPublicEndpoint = publicExactPaths.includes(pathname)
        || publicPathPrefixes.some(prefix => pathname.startsWith(prefix));
    if (isPublicEndpoint) {
        return response;
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
        throw new Error('NEXTAUTH_SECRET is not defined');
    }

    // retrieve the token from the request, no token redirect to login page
    const token = await getToken({ req, secret });
    if (!token) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    // Role fields in token:
    // - defaultRole: canonical "active" role selected for this session (preferred when present).
    // - role: legacy/single-role fallback kept for backward compatibility with older tokens.
    // - userRoles: full list of assigned roles used for multi-role authorization checks.
    // We prefer defaultRole over role to preserve explicit session role selection, while still
    // supporting older token payloads; userRoles defaults to [] so `.includes`/`.some` remain safe.
    const userRole = token.defaultRole || token.role;
    const userRoles = token.userRoles || [];

    // admin-only routes
    const adminOnlyRoutes = ['/userRoles'];
    const isAdminOnlyRoute = adminOnlyRoutes.some(route => pathname.startsWith(route));
    if (isAdminOnlyRoute && userRole !== 'admin' && !userRoles.includes('admin')) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // admin + teacher routes
    const adminTeacherRoutes = ['/classes', '/subjects'];
    const isAdminTeacherRoute = adminTeacherRoutes.some(route => pathname.startsWith(route));
    const isAdminOrTeacher = userRole === 'admin' || userRole === 'teacher' || userRoles.includes('admin') || userRoles.includes('teacher');
    if (isAdminTeacherRoute && !isAdminOrTeacher) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // tutor hours — admin, tutor, coach routes
    const tutorOnlyRoutes = ['/tutorHours'];
    const isTutorOnlyRoute = tutorOnlyRoutes.some(route => pathname.startsWith(route));
    const canAccessTutorHours = ['admin', 'tutor', 'coach'].includes(userRole) || userRoles.some(r => ['admin', 'tutor', 'coach'].includes(r));
    if (isTutorOnlyRoute && !canAccessTutorHours) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // token exists, allow the request
    return response;
}

// Define the paths that the middleware will apply to
export const config = {
    matcher: [
        '/dashboard/:path*',
        '/userRoles/:path*',
        '/calendar/:path*',
        '/classes/:path*',
        '/subjects/:path*',
        '/tutorHours/:path*',
        '/maintenance',
        '/api/:path*'
    ]
};

