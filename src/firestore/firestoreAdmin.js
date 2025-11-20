import admin from 'firebase-admin';

// initialise Firebase Admin SDK
if (!admin.apps.length) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        console.log(
            'FIREBASE_SERVICE_ACCOUNT_KEY is not set. Skipping Firebase Admin initialization.',
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
