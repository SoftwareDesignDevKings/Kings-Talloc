// firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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

export { app, auth, db, storage };
