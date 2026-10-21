// Counts Firestore reads the browser makes directly (live listeners, document
// gets) and reports them once a minute to /api/telemetry/reads, which writes
// them to the Vercel logs next to the server reads.
const FLUSH_MS = 60000;
const counts = new Map();
let timer = null;

const flush = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!counts.size) return;
    const body = JSON.stringify({ path: window.location.pathname, reads: Object.fromEntries(counts) });
    counts.clear();
    // fetch with keepalive survives page unloads like sendBeacon, but sends a
    // normal JSON request like the rest of the app (beacon bodies were not
    // reaching the route in production).
    try {
        fetch('/api/telemetry/reads', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true, credentials: 'same-origin' }).catch(() => {});
    } catch {
        // Telemetry must never affect the app.
    }
};

const add = (label, reads) => {
    if (typeof window === 'undefined' || !(reads > 0)) return;
    counts.set(label, (counts.get(label) || 0) + reads);
    timer ||= setTimeout(flush, FLUSH_MS);
};

if (typeof window !== 'undefined') window.addEventListener('pagehide', flush);

/**
 * A listener snapshot is billed for the documents the server sent: every
 * changed document in a query, or the document itself. Snapshots served from
 * the local cache cost nothing.
 */
export const recordSnapshotReads = (label, snapshot) => {
    // Cached and local-write (pending) snapshots aren't server reads.
    if (!snapshot || snapshot.metadata?.fromCache || snapshot.metadata?.hasPendingWrites) return;
    add(label, typeof snapshot.docChanges === 'function' ? snapshot.docChanges().length : 1);
};

/** A one-off getDocs/getDoc: documents returned, or 1 for an empty result. */
export const recordGetReads = (label, snapshot) => {
    add(label, typeof snapshot?.size === 'number' ? Math.max(snapshot.size, 1) : 1);
};
