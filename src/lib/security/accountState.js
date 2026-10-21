import 'server-only';
import { adminDb, adminDbAuth } from '@/firestore/firestoreAdmin';
import { findUserProfile } from './userProfiles';
import { cached, invalidateCached } from '@/lib/cache/sharedCache';

export const accountVersion = data => data?.authVersion || '';
export const validAccountEmail = email => typeof email === 'string' && email.length <= 254 && /^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(email);
const ROLES = new Set(['admin', 'teacher', 'tutor', 'coach', 'student']);
export const accountRoles = data => ({
    defaultRole: ROLES.has(data.defaultRole || data.role) ? data.defaultRole || data.role : 'student',
    userRoles: [...new Set((Array.isArray(data.userRoles) ? data.userRoles : []).filter(role => ROLES.has(role)))],
});

// Preserve legacy mixed-case document IDs while using normalised revocation keys.
export const findAccountProfile = (email, reader) => findUserProfile(adminDb, email, reader);

// Reads only; the caller applies the session's version check.
async function loadCurrentAccount(email) {
    const [profile, revoked, authUser] = await Promise.all([
        findAccountProfile(email),
        adminDb.collection('revokedAccounts').doc(email.toLowerCase()).get(),
        adminDbAuth.getUser(email.toLowerCase()).catch(error => {
            if (error.code === 'auth/user-not-found') return null;
            throw error;
        }),
    ]);
    if (!profile || revoked.exists || !authUser || authUser.disabled) return null;
    const data = profile.data();
    if (data.disabled === true) return null;
    return { ...data, ...accountRoles(data), email: profile.id, profileId: profile.id, authVersion: accountVersion(data) };
}
const checkVersion = (account, expectedVersion) =>
    account && (expectedVersion === undefined || account.authVersion === expectedVersion) ? account : null;

export async function getCurrentAccount(email, expectedVersion) {
    if (!validAccountEmail(email)) return null;
    return checkVersion(await loadCurrentAccount(email), expectedVersion);
}

// Session checks run on every API call and session refresh. Account changes made
// through /api/users invalidate this immediately; the TTL bounds console edits.
const ACCOUNT_CACHE_SECONDS = 60;
const accountKey = email => `account:${email.toLowerCase()}`;
export async function getCachedCurrentAccount(email, expectedVersion) {
    if (!validAccountEmail(email)) return null;
    return checkVersion(await cached(accountKey(email), ACCOUNT_CACHE_SECONDS, () => loadCurrentAccount(email)), expectedVersion);
}
export const invalidateCurrentAccount = email => validAccountEmail(email) ? invalidateCached(accountKey(email)) : undefined;
