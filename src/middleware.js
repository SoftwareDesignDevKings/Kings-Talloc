import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// ===== MAINTENANCE MODE =====
// Set to true to enable maintenance mode (redirects all users to /maintenance)
// Set to false to disable (normal operation)
const MAINTENANCE_MODE = true;
// ============================

export async function middleware(req) {
    const { pathname } = req.nextUrl;

    // Maintenance mode ENABLED - redirect everyone to /maintenance
    if (MAINTENANCE_MODE && pathname !== '/maintenance') {
        return NextResponse.redirect(new URL('/maintenance', req.url));
    }

    // Maintenance mode DISABLED - prevent accidental access to /maintenance
    if (!MAINTENANCE_MODE && pathname === '/maintenance') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // IF PUBLIC ENDPOINT (or redirect on login, no security checks)
    if (pathname === '/login' || pathname === '/' || pathname === '/maintenance' || pathname.startsWith('/api/auth')) {
        return NextResponse.next();
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

    const userRole = token.defaultRole || token.role;
    const userRoles = token.userRoles || [];

    // admin-only routes (routes)
    const adminOnlyRoutes = ['/userRoles', '/classes', '/subjects'];
    const isAdminOnlyRoute = adminOnlyRoutes.some(route => pathname.startsWith(route));
    if (isAdminOnlyRoute && userRole !== 'admin' && !userRoles.includes('admin')) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // routes accessible by admins, teachers, tutors, coaches (not students)
    const nonStudentRoutes = ['/tutorHours'];
    const isNonStudentRoute = nonStudentRoutes.some(route => pathname.startsWith(route));
    if (isNonStudentRoute && userRole === 'student' && !userRoles.some(r => ['admin', 'teacher', 'tutor', 'coach'].includes(r))) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // token exists, allow the request
    return NextResponse.next();
}

// pefine the paths that the middleware will apply to
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