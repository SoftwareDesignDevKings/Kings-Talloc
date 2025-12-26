import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req) {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
        throw new Error('NEXTAUTH_SECRET is not defined');
    }

    // allow public routes
    const { pathname } = req.nextUrl;
    if (pathname === '/login' || pathname === '/') {
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
        '/api/:path*'
    ]
};