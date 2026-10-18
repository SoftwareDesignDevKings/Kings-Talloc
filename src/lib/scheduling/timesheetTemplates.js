import 'server-only';
import { FieldPath } from 'firebase-admin/firestore';

// Legacy uploads used the profile's original email case as their document ID.
// Resolve it without rewriting templates or scanning an unbounded collection.
export async function findTimesheetTemplate(db, email) {
    if (typeof email !== 'string' || !/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(email) || email.length > 254) return null;
    const canonical = email.toLowerCase();
    const direct = (await Promise.all([...new Set([email, canonical])].map(id => db.collection('timesheets').doc(id).get()))).filter(doc => doc.exists);
    // New uploads use the canonical ID; an older case variant may still exist.
    const current = direct.find(doc => doc.id === canonical);
    if (current) return current;
    if (direct.length) return direct[0];
    const prefixes = [...new Set([canonical[0], canonical[0].toUpperCase()])];
    const snapshots = await Promise.all(prefixes.map(prefix => db.collection('timesheets')
        .orderBy(FieldPath.documentId()).startAt(prefix).endAt(prefix + '\uf8ff').limit(1001).get()));
    if (snapshots.some(snapshot => snapshot.size > 1000)) throw new Error('Template lookup is too large; contact an administrator.');
    const matches = snapshots.flatMap(snapshot => snapshot.docs).filter(doc => doc.id.toLowerCase() === canonical);
    if (matches.length > 1) throw new Error('Multiple timesheet templates have this email; contact an administrator.');
    return matches[0] || null;
}
