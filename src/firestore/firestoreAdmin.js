import admin from 'firebase-admin';

// initialise Firebase Admin SDK
if (!admin.apps.length) {
    // Use emulator settings for E2E tests
    if (process.env.E2E_TEST_ENABLED === '1') {
        admin.initializeApp({
            projectId: process.env.E2E_TEST_FIREBASE_PROJECT_ID || 'kings-talloc-e2e',
        });

        // Connect to emulators
        process.env.FIRESTORE_EMULATOR_HOST = process.env.E2E_TEST_FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
        process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.E2E_TEST_FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';

        console.log('Firebase Admin connected to emulators');
    } else if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        console.log(
            'FIREBASE_SERVICE_ACCOUNT_KEY is not set. Skipping Firebase Admin initialisation.',
        );
    } else {
        const serviceAccount = JSON.parse(
            Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8'),
        );

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }
}

// Server side firebase admin exports
// not for client, never import this file in client side code for 'use client'

/**
 * SERVER ONLY - Firebase AdminAuth instance
 */
export const adminAuth = admin.auth();

/**
 * SERVER ONLY - Firebase Admin Firestore instance
 */
export const adminDb = admin.firestore();
