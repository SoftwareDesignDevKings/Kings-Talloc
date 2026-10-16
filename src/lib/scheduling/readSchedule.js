import 'server-only';
import { DateTime } from 'luxon';
import { asDate, emailOf, expandRecurringEvents, SYDNEY_ZONE } from './eventRules';

export const documentEvent = doc => {
    const data = doc.data();
    return { ...data, id: doc.id, start: asDate(data.start), end: asDate(data.end), ...(data.until && { until: asDate(data.until) }) };
};


// Resolve cached class rosters without rewriting historical documents. Unknown
// or empty rosters stay conservatively occupied and retain the review warning.
export const resolveClassParticipants = async (db, event, transaction) => {
    if (!event.classes?.length || event.studentParticipantsResolved || event.students?.length || event.additionalStudents?.length) return event;
    const read = query => transaction ? transaction.get(query) : query.get();
    const rosters = await Promise.all(event.classes.map(async item => {
        const courseId = String(item.value || item.id || item);
        if (!courseId || courseId.includes('/')) return [];
        const [enrollments, legacy] = await Promise.all([
            read(db.collection('canvasEnrollments').where('courseId', '==', courseId)),
            read(db.collection('classes').doc(courseId)),
        ]);
        return [...enrollments.docs.map(doc => ({ value: emailOf(doc.data().email || doc.data().emailLower), label: doc.data().userName })),
            ...(legacy.data()?.students || []).map(student => ({ value: emailOf(student), label: student.label || student.name }))]
            .filter(student => student.value.includes('@'));
    }));
    if (rosters.some(roster => !roster.length)) return event;
    const students = [...new Map(rosters.flat().map(student => [student.value, { value: student.value, label: student.label || student.value }])).values()];
    return { ...event, students, studentParticipantsResolved: true };
};

// Queries work with legacy documents that do not have staffEmails/recurring:null.
// Use the transaction for every read when validating a write.
export const readSchedule = async (db, start, end, transaction, { includeFuture = false } = {}) => {
    const read = query => transaction ? transaction.get(query) : query.get();
    let currentQuery = db.collection('shifts').where('end', '>', start);
    let recurringQuery = db.collection('shifts').where('recurring', 'in', ['weekly', 'fortnightly']);
    if (!includeFuture) {
        currentQuery = currentQuery.where('start', '<', end).orderBy('start').orderBy('end');
        recurringQuery = recurringQuery.where('start', '<', end);
    }
    const [current, recurring] = await Promise.all([read(currentQuery), read(recurringQuery)]);
    const bases = await Promise.all([...new Map([...current.docs, ...recurring.docs].map(doc => [doc.id, documentEvent(doc)])).values()].map(event => resolveClassParticipants(db, event, transaction)));
    // An edit to a legacy open-ended series must check every already stored future
    // commitment, even if it is more than a year away.
    if (includeFuture) end = new Date(Math.max(+end, ...bases.map(event => {
        if (!event.recurring) return +event.end + 1;
        if (event.until) return +event.until + 86400000;
        if (event.occurenceNum) return +DateTime.fromJSDate(event.end, { zone: SYDNEY_ZONE }).plus({ weeks: (event.occurenceNum - 1) * (event.recurring === 'weekly' ? 1 : 2) }) + 1;
        return +event.end + 1;
    })));
    const earliest = Math.min(+start, ...bases.map(event => +event.start));
    const longest = Math.max(0, ...bases.map(event => +event.end - +event.start));
    return expandRecurringEvents(bases, { rangeStart: new Date(+start - longest), rangeEnd: end,
        maxOccurrences: Math.max(52, Math.ceil((+end - earliest) / (7 * 86400000)) + 3) })
        .filter(event => event.start < end && event.end > start);
};
