import Google from 'next-auth/providers/google';
import AzureAD from 'next-auth/providers/azure-ad';
import Credentials from 'next-auth/providers/credentials';
import { authFirebaseSignIn, authFirebaseGenerateToken } from './firebaseAuth';
import { authMsStoreTokens, authMsRefreshToken } from './msAuth';
import { adminDb } from '@/firestore/firestoreAdmin';
import { TEST_USERS as DEV_USERS} from '@/lib/security/testUsers';

// seed dev bypass users into Firestore on startup so they appear in /userRoles
if (process.env.NODE_ENV === 'development') {
    for (const emailKey in DEV_USERS) {
        const user = DEV_USERS[emailKey];
        if (user && user.name) {
            adminDb.collection('users').doc(emailKey).set({
                email: emailKey,
                name: user.name,
                role: user.role,
                defaultRole: user.defaultRole,
                userRoles: user.userRoles,
                calendarFeedToken: 'dev-bypass-token',
            }, { merge: true }).catch(console.error);
        }
    }
}

/**
 * Server-side: Create or fetch user role from Firestore on sign in
 */
async function handleSignIn({ user, account, profile }) {
    // Dev bypass for configured test users (development only)
    if (process.env.NODE_ENV === 'development' && DEV_USERS[user.email]) {
        const devUser = DEV_USERS[user.email];
        user.role = devUser.role;
        user.defaultRole = devUser.defaultRole;
        user.userRoles = devUser.userRoles;
        user.calendarFeedToken = 'dev-bypass-token';
        console.log(`🔧 Dev bypass activated for ${user.email} (${devUser.defaultRole})`);
        return true;
    }

    return authFirebaseSignIn({ user });
}

/**
 * Add user role to JWT token and refresh Firebase token periodically
 */
async function handleJwt({ token, user, account, profile }) {
    // Initial sign in - user object is available
    if (user) {
        token.role = user.role;
        token.defaultRole = user.defaultRole;
        token.userRoles = user.userRoles;
        token.email = user.email;
        token.name = user.name;
        token.calendarFeedToken = user.calendarFeedToken;

        // Store profile information if available
        if (profile) {
            token.profile = profile;
        }

        // Store user image/picture (works for Google)
        if (user.image) {
            token.picture = user.image;
        }

        // Store Microsoft tokens if available
        authMsStoreTokens(token, account);
    }

    // Refresh Microsoft access token if needed
    token = await authMsRefreshToken(token);

    // Refresh Firebase token if needed
    token = await authFirebaseGenerateToken(token, user);

    return token;
}

/**
 * Add role, firebaseToken, profile, and image from JWT to session object
 */
async function handleSession({ session, token }) {
    // Only modify session if it exists and has a user
    if (!session?.user) {
        return session;
    }

    session.user.role = token.role;
    session.user.defaultRole = token.defaultRole;
    session.user.userRoles = token.userRoles;
    session.user.firebaseToken = token.firebaseToken;
    session.user.calendarFeedToken = token.calendarFeedToken;

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

const devProviders = [];
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    for (const emailKey in DEV_USERS) {
        const user = DEV_USERS[emailKey];

        if (user) {
            const provider = Credentials({
                id: `dev-${emailKey.split('@')[0]}`,
                name: `Dev Login: ${user.name}`,
                credentials: {},
                async authorize() {
                    return { id: emailKey, email: emailKey, name: user.name };
                }
            });
            devProviders.push(provider);
        }
    }
}
/**
 * Authentication options for Google, Azure login for NextAuth
 */
export const authOptions = {
    providers: [
        ... devProviders,
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
                    scope: 'openid profile email offline_access User.Read Calendars.ReadWrite Mail.Send',
                },
            },
        }),
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
