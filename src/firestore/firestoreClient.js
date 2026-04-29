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


// app check for recaptcha in browser (only in production)
if (typeof window !== "undefined" && process.env.NODE_ENV !== 'development') {
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

// Connect to emulators in development mode (client-side only)
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    try {
        connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        connectFirestoreEmulator(db, '127.0.0.1', 8080);
        console.log('🔥 Connected to Firebase emulators');
    } catch (error) {
        // Ignore "already started" errors (hot reload)
        if (!error.message.includes('already been started')) {
            console.error('⚠️ Emulator connection failed:', error.message);
        }
    }
}

export { app, auth, db, storage };
