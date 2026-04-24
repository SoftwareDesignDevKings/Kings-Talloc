import admin from 'firebase-admin';

// Connect to emulators in development mode (must be set BEFORE initializing)
if (process.env.NODE_ENV === 'development') {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
}

// initialise Firebase Admin SDK
if (!admin.apps.length) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        console.log(
            'FIREBASE_SERVICE_ACCOUNT_KEY is not set. Skipping Firebase Admin initialisation.',
        );
    } else {
        const serviceAccount = JSON.parse(
            Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8'),
        );

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
    }
}

// Server side firebase admin exports
// not for client, never import this file in client side code for 'use client'

/**
 * SERVER ONLY - Firebase AdminAuth instance
 */
export const adminDbAuth = admin.auth();

/**
 * SERVER ONLY - Firebase Admin Firestore instance
 */
export const adminDb = admin.firestore();
