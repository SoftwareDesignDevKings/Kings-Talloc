// firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// init firebase, or just getApp
// optimise to prevent re-init for Next.js hot reload
let app;
if (getApps().length > 0) {
    app = getApp();
} else {
    app = initializeApp(firebaseConfig);
}

// app check for recaptcha in browser (skip in emulator mode)
if (typeof window !== "undefined" && !process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS) {
    initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(
            process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
        ),
        isTokenAutoRefreshEnabled: true,
    });
}

/**
 * CLIENT SIDE - Firebase Auth instance
 * for login/logout
 */
const auth = getAuth(app);

/**
 * CLIENT SIDE - Firebase Firestore instance
 */
const db = getFirestore(app);

/**
 * CLIENT SIDE - Firebase Storage instance
 */
const storage = getStorage(app);

// Connect to emulators if enabled
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === '1') {
    if (typeof window !== 'undefined') {
        // Only connect emulators on the client side once
        try {
            connectAuthEmulator(auth, `http://${process.env.NEXT_PUBLIC_E2E_TEST_FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
            connectFirestoreEmulator(db, process.env.NEXT_PUBLIC_E2E_TEST_FIRESTORE_EMULATOR_HOST, 8080);
            console.log('Connected to Firebase emulators');
        } catch (error) {
            // Emulators already connected
        }
    }
}

export { app, auth, db, storage };
