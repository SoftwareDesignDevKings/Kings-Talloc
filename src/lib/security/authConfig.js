import Google from 'next-auth/providers/google';
import AzureAD from 'next-auth/providers/azure-ad';
import Credentials from 'next-auth/providers/credentials';
import crypto from "crypto";
import { adminDb, adminDbAuth } from '@/firestore/firestoreAdmin';
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
 * 2. HELPER FUNCTIONS
 * ==========================================
 */

/**
 * Verify both firestore user entry, and register the user in firebaseAuth for signin later
 */
async function authFbVerifyUserRecords({ user }) {
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
            await adminDbAuth.getUser(userUid);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                await adminDbAuth.createUser({
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
 * ==========================================
 * 3. NEXTAUTH CALLBACK HANDLERS
 * ==========================================
 */
async function handleSignIn({ user }) {
    // dev bypass for configured test users (development only)
    if (process.env.NODE_ENV === 'development' && DEV_USERS[user.email]) {
        const devUser = DEV_USERS[user.email];

        user.role = devUser.role;
        user.defaultRole = devUser.defaultRole;
        user.userRolesList = devUser.userRoles;
        user.calendarFeedToken = 'dev-bypass-token';
        console.log(`Dev bypass activated for ${user.email} (${devUser.defaultRole})`);
        return true;
    }

    // verify Fb entry - both firestore userDoc and firebaseAuth user registration
    return await authFbVerifyUserRecords({ user })
}

async function handleJwt({ token, user, account, profile }) {
    if (user) {
        token.defaultRole = user.defaultRole || user.role;
        token.userRoles = user.userRolesList || [];

        token.email = user.email;
        token.name = user.name;
        token.calendarFeedToken = user.calendarFeedToken;

        if (profile) {
            token.profile = profile;
        }

        if (user.image) {
            token.picture = user.image;
        }

        const userUid = user.email.toLowerCase();

        token.firebaseToken = await adminDbAuth.createCustomToken(userUid, {
            defaultRole: user.defaultRole || user.role,
            userRoles: user.userRolesList || [],
        });
    }

    if (account?.provider === 'azure-ad') {
        token.msAccessToken = account.access_token;
        token.msRefreshToken = account.refresh_token;
        token.msAccessTokenExpiry = account.expires_at * 1000;
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
 * 4. DEVELOPMENT HELPERS
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