import { signIn, signOut as nextAuthSignOut } from 'next-auth/react';
import { signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth';
import { auth as clientAuth} from '@/firestore/firestoreClient';

import Google from 'next-auth/providers/google';
import AzureAD from 'next-auth/providers/azure-ad';
import Credentials from 'next-auth/providers/credentials';
import crypto from "crypto";
import { adminAuth, adminDb } from '@/firestore/firestoreAdmin';
import { TEST_USERS as DEV_USERS } from '@/lib/security/testUsers';


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

    try {
        await signInWithCustomToken(clientAuth, token);
        await clientAuth.currentUser?.getIdToken(true);
    } catch (error) {
        console.error("Firebase Sync Error:", error);
    }
};

export const fbAuthLogoutSync = async () => {
    try {
        await firebaseSignOut(clientAuth);
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


/**
 * Refresh Microsoft access token if about to expire
 */
export async function authMsRefreshToken(token) {
    if (
        !token.microsoftRefreshToken ||
        !token.microsoftTokenExpiry ||
        !token.microsoftAccessToken
    ) {
        return token;
    }

    if (process.env.NODE_ENV === "development") {
        return token
    }

    const FIVE_MINUTES = 5 * 60 * 1000;
    const shouldRefresh = Date.now() > token.microsoftTokenExpiry - FIVE_MINUTES;
    if (shouldRefresh) {
        try {
            const AZURE_AD_TENANT_ID = process.env.AZURE_AD_TENANT_ID;
            const response = await fetch(
                `https://login.microsoftonline.com/${AZURE_AD_TENANT_ID}/oauth2/v2.0/token`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        client_id: process.env.AZURE_AD_CLIENT_ID,
                        client_secret: process.env.AZURE_AD_CLIENT_SECRET,
                        grant_type: 'refresh_token',
                        refresh_token: token.microsoftRefreshToken,
                        scope: 'openid profile email offline_access User.Read Calendars.ReadWrite Mail.Send',
                    }),
                },
            );

            if (response.ok) {
                const tokens = await response.json();
                token.microsoftAccessToken = tokens.access_token;
                token.microsoftRefreshToken = tokens.refresh_token ?? token.microsoftRefreshToken;
                token.microsoftTokenExpiry = Date.now() + tokens.expires_in * 1000;
            } else {
                const errorData = await response.json();
                console.error('Failed to refresh Microsoft access token:', errorData);
            }
        } catch (error) {
            console.error('Error refreshing Microsoft access token:', error);
        }
    }

    return token;
}

/**
 * Verify both firestore user entry, and register the user in firebaseAuth for signin later
 */
export async function authFbVerifyUserRecords({ user }) {
    try {
        const userUid = user.email.toLowerCase();
        const userRef = adminDb.collection('users').doc(user.email);
        
        // STEP 1: check FB user entry - create entry if it doesnt exist
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            const calendarFeedToken = crypto.randomBytes(32).toString("hex");
            const newUser = {
                email: user.email,
                name: user.name,
                role: 'student',
                defaultRole: 'student',
                userRoles: [],
                calendarFeedToken,
            };
            await userRef.set(newUser);
            Object.assign(user, newUser); 
        } else {
            const userData = userDoc.data();
            user.defaultRole = userData.defaultRole || userData.role;
            user.userRolesList = userData.userRoles || [];
            user.calendarFeedToken = userData.calendarFeedToken || crypto.randomBytes(32).toString("hex");

            if (!userData.calendarFeedToken) {
                await userRef.update({ calendarFeedToken: user.calendarFeedToken });
            }
        }

        // STEP 2: create firebaseAuth user registration if required
        try {
            await adminAuth.getUser(userUid);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                await adminAuth.createUser({
                    uid: userUid,
                    email: user.email,
                    displayName: user.name,
                });
            }
        }
        return true;
    } catch (error) {
        console.error('CRITICAL: authFbVerify failed:', error);
        return false;
    }
}


/**
 * Generate and refresh Firebase custom token
     const FIFTY_MINUTES = 50 * 60 * 1000;
    const shouldRefreshToken =
        !token.firebaseTokenCreatedAt || Date.now() - token.firebaseTokenCreatedAt > FIFTY_MINUTES;

    // generate new Firebase token if needed (initial login or refresh)
    if (user || shouldRefreshToken) {
        const userUid = token.email.toLowerCase();
        const userRole = token.role;

        // ensure Firebase Auth user exists
        try {
            await adminAuth.getUser(userUid);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                try {
                    await adminAuth.createUser({
                        uid: userUid,
                        email: token.email,
                        displayName: token.name,
                    });
                } catch (createError) {
                    console.error('Error creating Firebase user:', createError);
                }
            } else {
                console.error('Error getting Firebase user:', error);
            }
        }

        // generate fresh Firebase custom token with role claims
        const firebaseToken = await adminAuth.createCustomToken(userUid, {
            role: userRole, // Keep for backward compatibility
            defaultRole: token.defaultRole || userRole,
            userRoles: token.userRoles || [],
            email: token.email,
        });        
        
        token.firebaseToken = firebaseToken;
        token.firebaseTokenCreatedAt = Date.now();
    }

    return token;
}
*/