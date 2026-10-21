import 'server-only';
import { adminDb } from '@/firestore/firestoreAdmin';
import { bumpCacheGroup, cached } from '@/lib/cache/sharedCache';

// Only what the User Roles page shows and edits; never auth versions or secrets.
const FIELDS = ['email', 'name', 'role', 'defaultRole', 'userRoles', 'disabled', 'requestNotificationsEnabled', 'tutorCoverage', 'tutorCoverageKeys'];

/**
 * Every account for the admin User Roles page. Cached so repeat visits don't
 * re-read the whole users collection; account saves, deletions and first
 * sign-ins bump the group.
 */
export const readAccountDirectory = () => cached('accounts:list', 600, async () => {
    const snapshot = await adminDb.collection('users').select(...FIELDS).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}, { group: 'accounts' });

export const invalidateAccountDirectory = () => bumpCacheGroup('accounts');
