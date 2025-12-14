import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/firestore/firestoreAdmin';
import { SignJWT } from 'jose';
import crypto from 'crypto';

/**
 * E2E Test-Only Login Endpoint
 * This endpoint creates test users and signs them into Firebase Auth emulator
 * ONLY available when E2E_TEST_ENABLED=1
 */
export async function POST(request) {
    // Only allow in E2E test mode
    if (process.env.E2E_TEST_ENABLED !== '1') {
        return NextResponse.json({ error: 'Not available' }, { status: 404 });
    }

    try {
        const { email, password, role } = await request.json();

        // Validate inputs
        if (!email || !password || !role) {
            return NextResponse.json(
                { error: 'Missing email, password, or role' },
                { status: 400 }
            );
        }

        // Validate role
        if (!['teacher', 'tutor', 'student'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        // Check password matches E2E_TEST_PASSWORD
        if (password !== process.env.E2E_TEST_PASSWORD) {
            return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
        }

        const uid = email.toLowerCase();
        const calendarFeedToken = crypto.randomBytes(32).toString('hex');

        // Create user in Firebase Auth emulator
        try {
            await adminAuth.getUser(uid);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                await adminAuth.createUser({
                    uid,
                    email,
                    displayName: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
                    emailVerified: true,
                });
            }
        }

        // Create user document in Firestore emulator
        await adminDb.collection('users').doc(email).set({
            email,
            name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
            role,
            calendarFeedToken,
        });

        // Create Firebase custom token
        const firebaseToken = await adminAuth.createCustomToken(uid, {
            role,
            email,
        });

        // Create NextAuth JWT token
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
        const token = await new SignJWT({
            sub: email,
            email,
            name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
            role,
            firebaseToken,
            firebaseTokenCreatedAt: Date.now(),
            calendarFeedToken,
            iat: Math.floor(Date.now() / 1000),
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('1h')
            .sign(secret);

        // Create session token for NextAuth
        const sessionToken = crypto.randomBytes(32).toString('hex');

        // Return session data for cookie creation
        return NextResponse.json({
            success: true,
            sessionToken,
            token,
            user: {
                email,
                name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
                role,
                firebaseToken,
                calendarFeedToken,
            },
        });
    } catch (error) {
        console.error('E2E login error:', error);
        return NextResponse.json(
            { error: 'Login failed', details: error.message },
            { status: 500 }
        );
    }
}
