import { signIn, signOut as nextAuthSignOut } from 'next-auth/react';
import { signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/firestore/firestoreClient';

// Token refresh interval singleton
let tokenRefreshInterval = null;
const FIFTY_MINUTES = 50 * 60 * 1000;

export const AppLogin = (provider = 'azure-ad') => {
    if (provider === "AZURE") {
        return signIn('azure-ad', { callbackUrl: '/dashboard' });
    } else if (provider === "GOOGLE") {
        return signIn('google', { callbackUrl: '/dashboard' });
    } else {
        // dev accounts: dev-computing, dev-tutor, dev-tutorAdmin, dev-teacher, dev-coach, dev-student
        return signIn(provider, { callbackUrl: '/dashboard' });
    }
};

export const AppLogout = async () => {
    await fbAuthLogoutSync();
    await nextAuthSignOut({ callbackUrl: '/login' });
};

export const fbRefreshToken = async (updateSession) => {
    try {
        const updatedSession = await updateSession();
        if (updatedSession?.user?.firebaseToken) {
            await fbAuthLoginSync(updatedSession.user.firebaseToken);
        }
    } catch (error) {
        console.error('Error refreshing Firebase token:', error);
    }
}; 

export const fbAuthLoginSync = async (token) => {
    if (!token) {
        return;
    }

    try {
        await signInWithCustomToken(auth, token);
        await auth.currentUser?.getIdToken(true);
    } catch (error) {
        console.error("Firebase Sync Error:", error);
    }
};

export const fbAuthLogoutSync = async () => {
    try {
        await firebaseSignOut(auth);
    } catch (error) {
        console.error("Firebase Logout Error:", error);
    }
};

// Start token refresh interval (called when user is authenticated)
export const startTokenRefresh = (updateSession) => {
    // Clear any existing interval
    if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
    }

    // Set up new interval
    tokenRefreshInterval = setInterval(() => {
        fbRefreshToken(updateSession);
    }, FIFTY_MINUTES);
};

// Stop token refresh interval (called when user logs out or unmounts)
export const stopTokenRefresh = () => {
    if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
        tokenRefreshInterval = null;
    }
};

// sync NextAuth session with Firebase - returns state updates for AuthProvider
export const syncNextFbAuth = async (session, status) => {
    try {
        if (status === 'authenticated' && session?.user) {
            const userRole = session.user.defaultRole || session.user.role;
            const userRoles = session.user.userRoles || [];

            if (session.user.firebaseToken) {
                await fbAuthLoginSync(session.user.firebaseToken);
            }

            return {
                isLoading: false,
                userRole,
                userRoles
            };
        }

        if (status === 'unauthenticated') {
            await fbAuthLogoutSync();
            return {
                isLoading: false,
                userRole: 'student',
                userRoles: []
            };
        }

        return { isLoading: true };
    } catch (err) {
        console.error('Error in syncing auth: ', err);
        console.error('Error code:', err.code);
        console.error('Error message:', err.message);
        return {
            isLoading: false,
            userRole: 'student',
            userRoles: []
        };
    }
};