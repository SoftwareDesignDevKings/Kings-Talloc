import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req) {
    // Ensure the secret is loaded
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
        throw new Error('NEXTAUTH_SECRET is not defined');
    }

    // Get the token from the request
    const token = await getToken({ req, secret });

    const { pathname } = req.nextUrl;

    // If token exists or the route is public, allow the request
    if (token || pathname === '/login') {
        return NextResponse.next();
    }

    // Redirect to login if the user is not authenticated
    if (!token && pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/login', req.url));
    }
}

// Define the paths that the middleware will apply to
export const config = {
    matcher: ['/dashboard/:path*'],
};
