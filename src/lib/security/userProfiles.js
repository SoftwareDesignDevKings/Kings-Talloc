import 'server-only';
import { FieldPath } from 'firebase-admin/firestore';

// Exact IDs stay intact for existing profiles. New profiles use lowercase IDs.
// Only a missing exact/canonical ID needs this bounded legacy lookup. Prefix
// queries cover both cases of the first character without scanning every user.
export async function findUserProfile(db, email, read = ref => ref.get()) {
    if (typeof email !== 'string' || !/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(email) || email.length > 254) return null;
    const canonical = email.toLowerCase();
    const direct = (await Promise.all([...new Set([email, canonical])].map(id => read(db.collection('users').doc(id))))).filter(doc => doc.exists);
    if (direct.length > 1) throw new Error('Multiple profiles have this email; contact an administrator.');
    if (direct.length) return direct[0];
    const prefixes = [...new Set([canonical[0], canonical[0].toUpperCase()])];
    const snapshots = await Promise.all(prefixes.map(prefix => read(db.collection('users')
        .orderBy(FieldPath.documentId()).startAt(prefix).endAt(prefix + '\uf8ff').limit(1001))));
    if (snapshots.some(snapshot => snapshot.size > 1000)) throw new Error('Account lookup is too large; contact an administrator.');
    const matches = snapshots.flatMap(snapshot => snapshot.docs).filter(doc => doc.id.toLowerCase() === canonical);
    if (matches.length > 1) throw new Error('Multiple profiles have this email; contact an administrator.');
    return matches[0] || null;
}
