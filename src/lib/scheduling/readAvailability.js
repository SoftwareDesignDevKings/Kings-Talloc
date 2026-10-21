import 'server-only';
import { documentEvent } from '@/lib/scheduling/readSchedule';
import { expandRecurringEvents, emailOf, staffEmails, studentEmails } from '@/lib/scheduling/eventRules';
import { hasTutorAccess } from '@/lib/canvas/canvasCoverage';

// Generous ceiling; never show an incomplete result as bookable time.
const MAX_DOCUMENTS = 5000;
const readBounded = async query => {
    const result = await query.limit(MAX_DOCUMENTS + 1).get();
    if (result.docs.length > MAX_DOCUMENTS) throw new Error('Availability result needs a smaller date range.');
    return result.docs;
};

const readTutors = async db => {
    // Role queries avoid reading every student profile, including legacy role-only tutors.
    const profiles = await Promise.all([
        readBounded(db.collection('users').where('defaultRole', '==', 'tutor').select('email', 'defaultRole', 'role', 'userRoles', 'disabled')),
        readBounded(db.collection('users').where('role', '==', 'tutor').select('email', 'defaultRole', 'role', 'userRoles', 'disabled')),
        readBounded(db.collection('users').where('userRoles', 'array-contains', 'tutor').select('email', 'defaultRole', 'role', 'userRoles', 'disabled')),
    ]);
    return [...new Set(profiles.flat().filter(doc => hasTutorAccess(doc.data()) && doc.data().disabled !== true)
        .map(doc => emailOf(doc.data().email || doc.id)))];
};

const readRecords = async (db, start, end) => {
    const [current, recurring, availability] = await Promise.all([
        // Uses the existing start/end index and preserves long legacy commitments.
        readBounded(db.collection('shifts').where('start', '<', end).where('end', '>', start).orderBy('start').orderBy('end')),
        // Old recurring bases may precede the window; future bases cannot affect it.
        readBounded(db.collection('shifts').where('recurring', 'in', ['weekly', 'fortnightly']).where('start', '<', end)),
        // Saved availability is limited to one day by the scheduling service.
        readBounded(db.collection('tutorAvailabilities').where('start', '>=', new Date(+start - 86400000)).where('start', '<', end)),
    ]);
    return {
        bases: [...new Map([...current, ...recurring].map(doc => [doc.id, documentEvent(doc)])).values()],
        availability: availability.map(documentEvent),
    };
};

/**
 * `cache(key, ttlSeconds, load)` lets callers share these reads between requests.
 * Only database reads are cached; eligibility and group filtering run every time.
 */
export async function readAvailability(db, start, end, eligibleEmails, group = [], { cache } = {}) {
    const load = (key, ttlSeconds, loader) => cache ? cache(key, ttlSeconds, loader) : loader();
    const tutors = (await load('availability:tutors', 300, () => readTutors(db))).filter(email => !eligibleEmails || eligibleEmails.has(email));
    if (!tutors.length) return { tutors, shifts: [], availability: [] };
    const tutorSet = new Set(tutors);
    const records = await load(`availability:records:${+start}:${+end}`, 120, () => readRecords(db, start, end));
    const bases = records.bases
        .filter(event => staffEmails(event).some(email => tutorSet.has(email)) || studentEmails(event).some(email => group.includes(email)));
    // Class-only legacy entries already count as occupied; no roster reads are needed.
    const longest = Math.max(0, ...bases.filter(event => event.recurring).map(event => +event.end - +event.start));
    if (longest > 86400000) throw new Error('Legacy recurring sessions longer than one day need review.');
    const shifts = expandRecurringEvents(bases, { rangeStart: new Date(+start - longest), rangeEnd: end })
        .filter(event => event.start < end && event.end > start);
    const available = records.availability.filter(event => tutorSet.has(emailOf(event.tutor)) && event.end > start);
    const counts = new Map();
    for (const event of shifts) for (const email of staffEmails(event)) counts.set(email, (counts.get(email) || 0) + 1);
    for (const event of available) { const email = emailOf(event.tutor); counts.set(email, (counts.get(email) || 0) + 1); }
    if (shifts.length > MAX_DOCUMENTS * 10 || [...counts.values()].some(count => count > 1000)) throw new Error('Availability result needs a smaller date range.');
    return { tutors, shifts, availability: available };
}
