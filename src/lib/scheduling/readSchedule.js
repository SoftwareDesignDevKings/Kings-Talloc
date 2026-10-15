import 'server-only';
import { asDate, expandRecurringEvents } from './eventRules';

export const documentEvent = doc => {
    const data = doc.data();
    return { ...data, id: doc.id, start: asDate(data.start), end: asDate(data.end), ...(data.until && { until: asDate(data.until) }) };
};

// Queries work with legacy documents that do not have staffEmails/recurring:null.
// Use the transaction for every read when validating a write.
export const readSchedule = async (db, start, end, transaction) => {
    const read = query => transaction ? transaction.get(query) : query.get();
    const [current, recurring] = await Promise.all([
        read(db.collection('shifts').where('end', '>', start)),
        read(db.collection('shifts').where('recurring', 'in', ['weekly', 'fortnightly'])),
    ]);
    const bases = [...new Map([...current.docs, ...recurring.docs].map(doc => [doc.id, documentEvent(doc)])).values()];
    const earliest = Math.min(+start, ...bases.map(event => +event.start));
    const longest = Math.max(0, ...bases.map(event => +event.end - +event.start));
    return expandRecurringEvents(bases, { rangeStart: new Date(+start - longest), rangeEnd: end,
        maxOccurrences: Math.max(52, Math.ceil((+end - earliest) / (7 * 86400000)) + 3) })
        .filter(event => event.start < end && event.end > start);
};
