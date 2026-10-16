import 'server-only';
import { adminDb, adminDbAuth } from '@/firestore/firestoreAdmin';

export const accountVersion = data => data?.authVersion || '';
export const validAccountEmail = email => typeof email === 'string' && email.length <= 254 && /^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(email);
const ROLES = new Set(['admin', 'teacher', 'tutor', 'coach', 'student']);
export const accountRoles = data => ({
    defaultRole: ROLES.has(data.defaultRole || data.role) ? data.defaultRole || data.role : 'student',
    userRoles: [...new Set((Array.isArray(data.userRoles) ? data.userRoles : []).filter(role => ROLES.has(role)))],
});

// Preserve legacy mixed-case document IDs while using normalised revocation keys.
export async function findAccountProfile(email, reader = ref => ref.get()) {
    if (!validAccountEmail(email)) return null;
    let snapshot = await reader(adminDb.collection('users').doc(email));
    if (!snapshot.exists && email !== email.toLowerCase()) snapshot = await reader(adminDb.collection('users').doc(email.toLowerCase()));
    return snapshot.exists ? snapshot : null;
}

export async function getCurrentAccount(email, expectedVersion) {
    if (!validAccountEmail(email)) return null;
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
    if (data.disabled === true || (expectedVersion !== undefined && accountVersion(data) !== expectedVersion)) return null;
    return { ...data, ...accountRoles(data), email: profile.id, profileId: profile.id, authVersion: accountVersion(data) };
}
