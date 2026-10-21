import 'server-only';
import { DateTime } from 'luxon';
import { Filter } from 'firebase-admin/firestore';
import { documentEvent } from '@/lib/scheduling/readSchedule';
import { expandRecurringEvents, emailOf, staffEmails, studentEmails, SYDNEY_ZONE } from '@/lib/scheduling/eventRules';
import { hasTutorAccess } from '@/lib/canvas/canvasCoverage';

// Generous ceiling; never show an incomplete result as bookable time.
const MAX_DOCUMENTS = 5000;
const DAY_MS = 86400000;
const readBounded = async query => {
    const result = await query.limit(MAX_DOCUMENTS + 1).get();
    if (result.docs.length > MAX_DOCUMENTS) throw new Error('Availability result needs a smaller date range.');
    return result.docs;
};

// App changes bump the cache group, so these only bound edits made outside the
// app and let Redis expire superseded entries.
const WEEK_TTL_SECONDS = 2 * 60 * 60;
const RECURRING_TTL_SECONDS = 2 * 60 * 60;
const TUTORS_TTL_SECONDS = 6 * 60 * 60;

const readTutors = async db => {
    // One OR query (each tutor read once) avoids reading every student profile,
    // including legacy role-only tutors.
    const docs = await readBounded(db.collection('users')
        .where(Filter.or(Filter.where('defaultRole', '==', 'tutor'), Filter.where('role', '==', 'tutor'), Filter.where('userRoles', 'array-contains', 'tutor')))
        .select('email', 'defaultRole', 'role', 'userRoles', 'disabled'));
    return [...new Set(docs.filter(doc => hasTutorAccess(doc.data()) && doc.data().disabled !== true)
        .map(doc => emailOf(doc.data().email || doc.id)))];
};

// Every recurring series, whatever the range: old bases may precede the window,
// and the set is small and shared by every request.
const readRecurring = async db => (await readBounded(db.collection('shifts').where('recurring', 'in', ['weekly', 'fortnightly'])))
    .map(documentEvent);

// One Monday-to-Monday Sydney week of shifts and availability, shared by every
// request that touches the week (calendar weeks, booking forms, longer ranges).
const readWeek = async (db, weekStart, weekEnd) => {
    const [shifts, availability] = await Promise.all([
        // Uses the existing start/end index and preserves long legacy commitments.
        readBounded(db.collection('shifts').where('start', '<', weekEnd).where('end', '>', weekStart).orderBy('start').orderBy('end')),
        // Saved availability is limited to one day by the scheduling service.
        readBounded(db.collection('tutorAvailabilities').where('start', '>=', new Date(+weekStart - DAY_MS)).where('start', '<', weekEnd)),
    ]);
    return { shifts: shifts.map(documentEvent), availability: availability.map(documentEvent) };
};

const weeksCovering = (start, end) => {
    const weeks = [];
    for (let week = DateTime.fromJSDate(start, { zone: SYDNEY_ZONE }).startOf('week'); week.toJSDate() < end; week = week.plus({ weeks: 1 })) {
        weeks.push([week.toJSDate(), week.plus({ weeks: 1 }).toJSDate()]);
    }
    return weeks;
};
const uniqueById = events => [...new Map(events.map(event => [event.id, event])).values()];

/**
 * `cache(key, ttlSeconds, load)` lets callers share these reads between requests.
 * Only database reads are cached; eligibility and group filtering run every time.
 */
export async function readAvailability(db, start, end, eligibleEmails, group = [], { cache } = {}) {
    const load = (key, ttlSeconds, loader) => cache ? cache(key, ttlSeconds, loader) : loader();
    const tutors = (await load('availability:tutors', TUTORS_TTL_SECONDS, () => readTutors(db))).filter(email => !eligibleEmails || eligibleEmails.has(email));
    if (!tutors.length) return { tutors, shifts: [], availability: [] };
    const tutorSet = new Set(tutors);
    const [recurring, weeks] = await Promise.all([
        load('availability:recurring', RECURRING_TTL_SECONDS, () => readRecurring(db)),
        Promise.all(weeksCovering(start, end).map(([weekStart, weekEnd]) =>
            load(`availability:week:${+weekStart}`, WEEK_TTL_SECONDS, () => readWeek(db, weekStart, weekEnd)))),
    ]);
    const bases = uniqueById([...weeks.flatMap(week => week.shifts), ...recurring.filter(event => event.start < end)])
        .filter(event => staffEmails(event).some(email => tutorSet.has(email)) || studentEmails(event).some(email => group.includes(email)));
    // Class-only legacy entries already count as occupied; no roster reads are needed.
    const longest = Math.max(0, ...bases.filter(event => event.recurring).map(event => +event.end - +event.start));
    if (longest > DAY_MS) throw new Error('Legacy recurring sessions longer than one day need review.');
    const shifts = expandRecurringEvents(bases, { rangeStart: new Date(+start - longest), rangeEnd: end })
        .filter(event => event.start < end && event.end > start);
    const available = uniqueById(weeks.flatMap(week => week.availability))
        .filter(event => tutorSet.has(emailOf(event.tutor)) && event.start < end && event.end > start);
    const counts = new Map();
    for (const event of shifts) for (const email of staffEmails(event)) counts.set(email, (counts.get(email) || 0) + 1);
    for (const event of available) { const email = emailOf(event.tutor); counts.set(email, (counts.get(email) || 0) + 1); }
    if (shifts.length > MAX_DOCUMENTS * 10 || [...counts.values()].some(count => count > 1000)) throw new Error('Availability result needs a smaller date range.');
    return { tutors, shifts, availability: available };
}
