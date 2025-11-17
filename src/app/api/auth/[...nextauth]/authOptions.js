import Google from 'next-auth/providers/google';
import AzureAD from 'next-auth/providers/azure-ad';

import { adminAuth, adminDb } from '@/firestore/adminFirebase';
// import { redirect } from 'next/navigation';

/**
 * Server-side: Create or fetch user role from Firestore on sign in
 */
async function handleSignIn({ user, account, profile }) {
    try {
        const email = user.email.toLowerCase();

        // temp disable - until ICT fixes Google Workspace issue

        // const emailRegex = /^[^@]+@(student\.)?kings\.edu\.au$/i;
        // const isValidDomain = emailRegex.test(email);
        // if (!isValidDomain) {
        //     return false;
        // }

        const userRef = adminDb.collection('users').doc(user.email);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            // Create new user with default "student" role (server-side, secure)
            await userRef.set({email: user.email, name: user.name, role: "student"});
            user.role = "student";
        } else {
            // Fetch existing role from Firestore
            user.role = userDoc.data().role;
        }

        return true;
    } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
    }
}

/**
 * Add user role to JWT token and refresh Firebase token periodically
 */
async function handleJwt({ token, user, account, profile }) {
    // Initial sign in - user object is available
    if (user) {
        token.role = user.role;
        token.email = user.email;
        token.name = user.name;
        token.firebaseTokenCreatedAt = Date.now();

        // Store profile information if available
        if (profile) {
            token.profile = profile;
        }

        // Store user image/picture (works for Google)
        if (user.image) {
            token.picture = user.image;
        }

        // Store Microsoft tokens if available
        if (account?.provider === 'azure-ad') {
            token.microsoftAccessToken = account.access_token;
            token.microsoftRefreshToken = account.refresh_token;
            token.microsoftTokenExpiry = account.expires_at * 1000; // Convert to milliseconds
        }
    }

    // Refresh Microsoft access token if it's about to expire
    if (token.microsoftRefreshToken && token.microsoftTokenExpiry) {
        const shouldRefreshMicrosoftToken = Date.now() > token.microsoftTokenExpiry - 5 * 60 * 1000; // Refresh 5 minutes before expiry

        if (shouldRefreshMicrosoftToken) {
            try {
                const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
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
                });

                if (response.ok) {
                    const tokens = await response.json();
                    token.microsoftAccessToken = tokens.access_token;
                    token.microsoftRefreshToken = tokens.refresh_token ?? token.microsoftRefreshToken;
                    token.microsoftTokenExpiry = Date.now() + tokens.expires_in * 1000;
                } else {
                    console.error('Failed to refresh Microsoft access token');
                }
            } catch (error) {
                console.error('Error refreshing Microsoft access token:', error);
            }
        }
    }

    // Check if we need to refresh the Firebase token (every 50 minutes to be safe)
    const FIFTY_MINUTES = 50 * 60 * 1000;
    const shouldRefreshToken = !token.firebaseTokenCreatedAt ||
        (Date.now() - token.firebaseTokenCreatedAt > FIFTY_MINUTES);

    // Generate new Firebase token if needed (initial login or refresh)
    if (user || shouldRefreshToken) {
        const userUid = (user?.email || token.email).toLowerCase();
        const userRole = user?.role || token.role;

        // Ensure Firebase Auth user exists
        try {
            await adminAuth.getUser(userUid);
        } catch (error) {
            if (error.code === "auth/user-not-found") {
                try {
                    await adminAuth.createUser({
                        uid: userUid,
                        email: user?.email || token.email,
                        displayName: user?.name || token.name,
                    });
                } catch (createError) {
                    console.log("Error creating user:", createError);
                }
            } else {
                console.log("Error getting user:", error);

                // TODO: redirect login - disabled for testing
                // redirect("/login")
            }
        }

        // Generate fresh Firebase custom token
        const firebaseToken = await adminAuth.createCustomToken(userUid, { role: userRole });
        token.firebaseToken = firebaseToken;
        token.firebaseTokenCreatedAt = Date.now();
    }

    return token;
}

/**
 * Add role, firebaseToken, profile, and image from JWT to session object
 */
async function handleSession({ session, token }) {
    session.user.role = token.role;
    session.user.firebaseToken = token.firebaseToken;

    // Add profile information if available
    if (token.profile) {
        session.user.profile = token.profile;
    }

    // Add profile picture if available
    if (token.picture) {
        session.user.image = token.picture;
    }

    // Add Microsoft access token if available
    if (token.microsoftAccessToken) {
        session.user.microsoftAccessToken = token.microsoftAccessToken;
    }

    return session;
}

export const authOptions = {
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        AzureAD({
            clientId: process.env.AZURE_AD_CLIENT_ID,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
            tenantId: process.env.AZURE_AD_TENANT_ID,
            authorization: {
                params: {
                    scope: "openid profile email offline_access User.Read Calendars.ReadWrite Mail.Send"
                }
            }
        })
    ],
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: '/login',
        error: '/login',
    },
    callbacks: {
        signIn: handleSignIn,
        jwt: handleJwt,
        session: handleSession,
    },
};
