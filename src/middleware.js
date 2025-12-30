import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// ===== MAINTENANCE MODE =====
// Set to true to enable maintenance mode (redirects all users to /maintenance)
// Set to false to disable (normal operation)
const MAINTENANCE_MODE = false;
// ============================

export async function middleware(req) {
    const { pathname } = req.nextUrl;

    // Maintenance mode enabled - redirect everyone to /maintenance
    if (MAINTENANCE_MODE && pathname !== '/maintenance') {
        return NextResponse.redirect(new URL('/maintenance', req.url));
    }

    // Maintenance mode disabled - prevent accidental access to /maintenance
    if (!MAINTENANCE_MODE && pathname === '/maintenance') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
        throw new Error('NEXTAUTH_SECRET is not defined');
    }

    if (pathname === '/login' || pathname === '/' || pathname.startsWith('/api/auth')) {
        return NextResponse.next();
    }

    // retrieve the token from the request, no token redirect to login page
    const token = await getToken({ req, secret });
    if (!token) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    const userRole = token.role;

    // teacher-only routes
    const teacherOnlyRoutes = ['/userRoles', '/classes', '/subjects'];
    const isTeacherOnlyRoute = teacherOnlyRoutes.some(route => pathname.startsWith(route));
    if (isTeacherOnlyRoute && userRole !== 'teacher') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // routes accessible by teachers and tutors (not students)
    const teacherTutorRoutes = ['/tutorHours'];
    const isTeacherTutorRoute = teacherTutorRoutes.some(route => pathname.startsWith(route));
    if (isTeacherTutorRoute && userRole === 'student') {
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