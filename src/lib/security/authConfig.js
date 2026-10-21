import AzureAD from 'next-auth/providers/azure-ad';
import Credentials from 'next-auth/providers/credentials';
import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { findAccountProfile, getCachedCurrentAccount, invalidateCurrentAccount, accountVersion, accountRoles, validAccountEmail } from './accountState';
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
        // Google({
        //     clientId: process.env.GOOGLE_CLIENT_ID,
        //     clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        // }),
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
        if (!validAccountEmail(user.email)) return false;
        const userUid = user.email.toLowerCase();
        const revoked = await adminDb.collection('revokedAccounts').doc(userUid).get();
        if (revoked.exists) return false;
        let profile = await findAccountProfile(user.email);
        if (!profile) {
            const devUser = process.env.NODE_ENV === 'development' ? DEV_USERS[user.email] : null;
            const newUser = {
                email: userUid, name: user.name || user.email,
                role: devUser?.defaultRole || 'student', defaultRole: devUser?.defaultRole || 'student',
                userRoles: devUser?.userRoles || [], authVersion: crypto.randomUUID(),
            };
            // A competing first login must not overwrite a profile or an admin's roles.
            const ref = adminDb.collection('users').doc(userUid);
            await adminDb.runTransaction(async transaction => {
                const [existing, blocked] = await Promise.all([transaction.get(ref), transaction.get(adminDb.collection('revokedAccounts').doc(userUid))]);
                if (blocked.exists) throw new Error('Account access was revoked');
                if (!existing.exists) transaction.create(ref, newUser);
            });
            profile = await findAccountProfile(user.email);
        }
        const data = profile.data();
        if (data.disabled === true) return false;
        // Legacy public keys are never copied or reused by the new feed endpoint.
        if ('calendarFeedToken' in data) await profile.ref.update({ calendarFeedToken: FieldValue.delete() });
        const roles = accountRoles(data);
        user.email = profile.id;
        user.defaultRole = roles.defaultRole;
        user.userRolesList = roles.userRoles;
        user.authVersion = accountVersion(data);
        user.profileId = profile.id;
        try {
            const authUser = await adminDbAuth.getUser(userUid);
            if (authUser.disabled) return false;
        } catch (error) {
            if (error.code !== 'auth/user-not-found') throw error;
            await adminDbAuth.createUser({ uid: userUid, email: user.email, displayName: user.name || user.email });
        }
        // A new or restored account must not inherit a cached "no account" result.
        await invalidateCurrentAccount(userUid);
        return true;
    } catch (error) {
        console.error('Account verification failed:', error);
        return false;
    }
}

/**
 * ==========================================
 * 3. NEXTAUTH CALLBACK HANDLERS
 * ==========================================
 */
async function handleSignIn({ user }) {
    return authFbVerifyUserRecords({ user });
}

async function handleJwt({ token, user, account, profile }) {
    if (user) {
        token.defaultRole = user.defaultRole || user.role;
        token.userRoles = user.userRolesList || [];

        token.email = user.email;
        token.name = user.name;
        token.authVersion = user.authVersion || '';
        token.profileId = user.profileId || user.email;

        if (profile) {
            token.profile = profile;
        }

        if (user.image) {
            token.picture = user.image;
        }
    }

    if (account?.provider === 'azure-ad') {
        token.msAccessToken = account.access_token;
        token.msRefreshToken = account.refresh_token;
        token.msAccessTokenExpiry = account.expires_at * 1000;
    }

    delete token.calendarFeedToken;
    let revoked = false;
    try {
        const account = await getCachedCurrentAccount(token.email, token.authVersion || '');
        if (!account) { revoked = true; throw new Error('Account access was revoked'); }
        token.defaultRole = account.defaultRole;
        token.userRoles = account.userRoles;
        token.profileId = account.profileId;
        token.authVersion = account.authVersion;
        token.accountValid = true;
        token.firebaseToken = await adminDbAuth.createCustomToken(token.email.toLowerCase(), {
            defaultRole: account.defaultRole, userRoles: account.userRoles,
            profileId: account.profileId, authVersion: account.authVersion,
        });
    } catch {
        token.accountValid = false;
        delete token.firebaseToken;
        delete token.defaultRole;
        token.userRoles = [];
        if (revoked) {
            delete token.msAccessToken;
            delete token.msRefreshToken;
        }
    }

    return token;
}

async function handleSession({ session, token }) {
    if (!session?.user) return session;
    if (token.accountValid !== true) return { ...session, user: null, error: 'AccessRevoked' };

    session.user.role = token.defaultRole;
    session.user.defaultRole = token.defaultRole;
    session.user.userRoles = token.userRoles;
    session.user.firebaseToken = token.firebaseToken;
    delete session.user.calendarFeedToken;
    session.user.authVersion = token.authVersion || '';
    session.user.profileId = token.profileId;

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
