import 'server-only';
import { Firestore, Query, Transaction } from 'firebase-admin/firestore';

/**
 * Logs every server-side Firestore read as one line in the Vercel logs:
 *   [firestore-reads] source=server reads=12 collection=shifts op=query route=/api/availability
 * "reads" is what Firestore bills: documents returned, or 1 for an empty query.
 * Turn off with FIRESTORE_READ_LOGGING=off.
 */
const ENABLED = Symbol.for('talloc.firestoreReadLogging');

const currentRoute = async () => {
    try {
        const { headers } = await import('next/headers');
        const requestHeaders = await headers();
        return requestHeaders.get('x-matched-path') || requestHeaders.get('x-invoke-path') || requestHeaders.get('next-url') || 'unknown';
    } catch {
        // Outside a request (e.g. build time or a script).
        return 'none';
    }
};

const logReads = (reads, collection, op) => {
    currentRoute().then(route => console.log(`[firestore-reads] source=server reads=${reads} collection=${collection} op=${op} route=${route}`));
};

const queryCollection = query => query?._queryOptions?.collectionId || 'unknown';
const docCollection = ref => ref?.parent?.id || 'unknown';
const logDocuments = (refs, op) => {
    const byCollection = new Map();
    refs.filter(ref => ref?.parent).forEach(ref => byCollection.set(docCollection(ref), (byCollection.get(docCollection(ref)) || 0) + 1));
    byCollection.forEach((reads, collection) => logReads(reads, collection, op));
};

// Wrap after the original resolves so failed reads are not counted.
const wrap = (prototype, name, count) => {
    const original = prototype[name];
    prototype[name] = async function (...args) {
        const result = await original.apply(this, args);
        try { count.call(this, result, args); } catch { /* logging must never break a read */ }
        return result;
    };
};

export function enableFirestoreReadLogging() {
    if (globalThis[ENABLED] || process.env.NODE_ENV === 'test' || process.env.FIRESTORE_READ_LOGGING === 'off') return;
    globalThis[ENABLED] = true;
    // DocumentReference.get() goes through Firestore.getAll(); transactions use
    // their own readers, so each read is counted exactly once.
    wrap(Query.prototype, 'get', function (snapshot) { logReads(Math.max(snapshot.size, 1), queryCollection(this), 'query'); });
    wrap(Firestore.prototype, 'getAll', (_snapshots, refs) => logDocuments(refs, 'doc'));
    wrap(Transaction.prototype, 'get', (result, [refOrQuery]) => {
        if (typeof result?.size === 'number') logReads(Math.max(result.size, 1), queryCollection(refOrQuery), 'transaction-query');
        else logDocuments([refOrQuery], 'transaction-doc');
    });
    wrap(Transaction.prototype, 'getAll', (_snapshots, refs) => logDocuments(refs, 'transaction-doc'));
}
