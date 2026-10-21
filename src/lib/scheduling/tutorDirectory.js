import 'server-only';
import { adminDb } from '@/firestore/firestoreAdmin';
import { availabilityCache } from './availabilityCache';

const STAFF_ROLES = ['tutor', 'coach'];
const FIELDS = ['email', 'name', 'defaultRole', 'role', 'userRoles', 'disabled'];

/**
 * Tutors and coaches for calendar filters and staff pickers. Every signed-in user
 * needs this list; one cached server read replaces three overlapping browser
 * queries per tab. Account changes bump the availability group.
 */
export const readTutorDirectory = () => availabilityCache('directory:tutors', 1800, async () => {
    const snapshots = await Promise.all([
        adminDb.collection('users').where('role', 'in', STAFF_ROLES).select(...FIELDS).get(),
        adminDb.collection('users').where('defaultRole', 'in', STAFF_ROLES).select(...FIELDS).get(),
        adminDb.collection('users').where('userRoles', 'array-contains-any', STAFF_ROLES).select(...FIELDS).get(),
    ]);
    const tutors = new Map();
    snapshots.flatMap(snapshot => snapshot.docs).forEach(doc => {
        const { email, name, defaultRole, role, userRoles, disabled } = doc.data();
        if (disabled === true || !email || tutors.has(email)) return;
        tutors.set(email, { email, name, roles: [defaultRole || role, ...(userRoles || [])].filter(Boolean) });
    });
    return [...tutors.values()];
});
