import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { enableFirestoreReadLogging } from '@/lib/telemetry/firestoreReadLog';

// Every server read is logged so quota use can be traced to a route.
enableFirestoreReadLogging();

// Connect to emulators in development mode (must be set BEFORE initializing)
if (process.env.NODE_ENV === 'development') {
    process.env.FIRESTORE_EMULATOR_HOST = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
}

// initialise Firebase Admin SDK
if (!getApps().length) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';
        if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test' && !isBuildTime) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is required outside development.');
        }
        initializeApp({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-no-project',
        });
    } else {
        const serviceAccount = JSON.parse(
            Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8'),
        );

        initializeApp({
            credential: cert(serviceAccount),
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
    }
}

// Server side firebase admin exports
// not for client, never import this file in client side code for 'use client'

/**
 * SERVER ONLY - Firebase AdminAuth instance
 */
export const adminDbAuth = getAuth();

/**
 * SERVER ONLY - Firebase Admin Firestore instance
 */
export const adminDb = getFirestore();
