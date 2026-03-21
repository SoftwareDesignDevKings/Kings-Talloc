import Google from 'next-auth/providers/google';
import AzureAD from 'next-auth/providers/azure-ad';
import Credentials from 'next-auth/providers/credentials';
import { authMsRefreshToken, authMsStoreTokens, authFirebaseGenerateToken, authFbVerifyUserRecords } from './auth';
import { adminDb, adminAuth } from '@/firestore/firestoreAdmin';
import { TEST_USERS as DEV_USERS } from '@/lib/security/testUsers';

/**
 * ==========================================
 * 1. NEXTAUTH CORE CONFIG
 * ==========================================
 */
export const authOptions = {
    providers: [
        ...generateDevProviders(),
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

/**
 * ==========================================
 * 2. NEXTAUTH CALLBACK HANDLERS
 * ==========================================
 */
async function handleSignIn({ user }) {
    // dev bypass for configured test users (development only)
    if (process.env.NODE_ENV === 'development' && DEV_USERS[user.email]) {
        const devUser = DEV_USERS[user.email];
        
        user.role = devUser.role;
        user.defaultRole = devUser.defaultRole;
        user.userRoles = devUser.userRoles;
        user.calendarFeedToken = 'dev-bypass-token';
        console.log(`Dev bypass activated for ${user.email} (${devUser.defaultRole})`);
        return true;
    }

    // verify Fb entry - both firestore userDoc and firebaseAuth user registration
    return authFbVerifyUserRecords({ user })
}

async function handleJwt({ token, user, account, profile }) {
    if (user) {
        token.defaultRole = user.defaultRole;
        token.userRoles = user.userRolesList;

        token.email = user.email;
        token.name = user.name;
        token.calendarFeedToken = user.calendarFeedToken;

        if (profile) {
            token.profile = profile;
        }
        if (user.image) {
            token.picture = user.image;
        }

        // signin user after verified in NextAuth signInCallbacl callback
        user.firebaseToken = await adminAuth.createCustomToken(userUid, {
            role: user.role,
            userRoles: user.userRolesList
        });

        // retrieve access / refresh tokens from Azure - store in JWT
        if (account.provider === 'azure-ad') {
            token.microsoftAccessToken = account.access_token;
            token.microsoftRefreshToken = account.refresh_token;
        
            token.microsoftTokenExpiry = account.expires_at * 1000;
        }
    }

    return token;
}

async function handleSession({ session, token }) {
    if (!session?.user) return session;

    session.user.role = token.role;
    session.user.defaultRole = token.defaultRole;
    session.user.userRoles = token.userRoles;
    session.user.firebaseToken = token.firebaseToken;
    session.user.calendarFeedToken = token.calendarFeedToken;

    if (token.profile) session.user.profile = token.profile;
    if (token.picture) session.user.image = token.picture;

    return session;
}

/**
 * ==========================================
 * 3. DEVELOPMENT HELPERS
 * ==========================================
 */

/**
 * Generates a list of NextAuth Credentials providers based on TEST_USERS
 */
function generateDevProviders() {
    if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
        return [];
    }

    return Object.entries(DEV_USERS).map(([emailKey, user]) => {
        return Credentials({
            id: `dev-${emailKey.split('@')[0]}`,
            name: `Dev Login: ${user.name}`,
            credentials: {},
            async authorize() {
                // Return basic user info; handleSignIn will hydrate the rest from DEV_USERS
                return { id: emailKey, email: emailKey, name: user.name };
            }
        });
    });
}

// create dev bypass users into Firestore on startup for emulators
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