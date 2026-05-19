import { signIn, signOut as nextAuthSignOut } from 'next-auth/react';
import { signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth';
import { auth as clientAuth} from '@/firestore/firestoreClient';


/**
 * Login component event handler - NextAuth signin for Azure or Google. 
 * @param {String} provider 
 * @returns 
 */
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

/**
 * Logout component event handler - NextAuth signout for Azure or Google. 
 * @param {String} provider 
 * @returns 
 */
export const AppLogout = async () => {
    try {
        await firebaseSignOut(clientAuth);
        await nextAuthSignOut({ callbackUrl: '/login' });
    } catch (error) {
        console.error("Firebase Logout Error:", error);
    }
};

export const fbAuthLogoutSync = async () => {
    try {
        await firebaseSignOut(clientAuth);
    } catch (error) {
        console.error("Firebase Logout Error:", error);
    }
};

// Token refresh interval singleton
let tokenRefreshInterval = null;
const FIFTY_MINUTES = 50 * 60 * 1000;

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

    // Always consume the fresh custom token so Firestore rules see current role claims.
    try {
        await signInWithCustomToken(clientAuth, token);
    } catch (error) {
        console.error("Firebase Sync Error:", error);
    }
};

// start token refresh interval (called when user is authenticated)
export const startTokenRefresh = (updateSession) => {
    if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
    }

    tokenRefreshInterval = setInterval(() => fbRefreshToken(updateSession), FIFTY_MINUTES);
};

// stop token refresh interval (called when user logs out or unmounts)
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
