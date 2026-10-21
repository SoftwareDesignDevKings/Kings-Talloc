import 'server-only';
import { cached } from '@/lib/cache/sharedCache';

const duplicateProfiles = () => new Error('Multiple profiles have this email; contact an administrator.');

// The app only creates lowercase profile IDs, so other spellings come from legacy
// profiles. Their IDs are kept in the shared cache by lowercase spelling (one
// ID-only read of users a day) instead of scanning users by first letter on every
// miss, which cost up to ~2,000 reads per new sign-in or legacy tutor booking.
const LEGACY_ALIASES_TTL_SECONDS = 86400;
const readLegacyAliases = async db => {
    const snapshot = await db.collection('users').select().get();
    const aliases = {};
    for (const doc of snapshot.docs) {
        const canonical = doc.id.toLowerCase();
        if (doc.id !== canonical) (aliases[canonical] ||= []).push(doc.id);
    }
    return aliases;
};
export const legacyProfileAliases = db => cached('accounts:legacy-aliases', LEGACY_ALIASES_TTL_SECONDS, () => readLegacyAliases(db));

// Exact IDs stay intact for existing profiles. New profiles use lowercase IDs.
// Every profile read goes through `read`, so transactions still lock what they use.
export async function findUserProfile(db, email, read = ref => ref.get(), { aliases = legacyProfileAliases } = {}) {
    if (typeof email !== 'string' || !/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(email) || email.length > 254) return null;
    const canonical = email.toLowerCase();
    const direct = (await Promise.all([...new Set([email, canonical])].map(id => read(db.collection('users').doc(id))))).filter(doc => doc.exists);
    if (direct.length > 1) throw duplicateProfiles();
    if (direct.length) return direct[0];
    // A stale alias for a deleted profile just reads a missing document.
    const legacyIds = ((await aliases(db))[canonical] || []).filter(id => id !== email && id !== canonical);
    const matches = (await Promise.all(legacyIds.map(id => read(db.collection('users').doc(id))))).filter(doc => doc.exists);
    if (matches.length > 1) throw duplicateProfiles();
    return matches[0] || null;
}
