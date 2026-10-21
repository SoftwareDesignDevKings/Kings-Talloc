import { getToken } from 'next-auth/jwt';

const MAX_LABELS = 50;
const clean = value => String(value).replace(/[^\w:/.@-]/g, '').slice(0, 120);

// The session cookie name depends on whether the deployment is treated as
// HTTPS; try both so a mismatch never hides a report.
const readSession = async request => {
    for (const secureCookie of [undefined, true, false]) {
        try {
            const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET, ...(secureCookie !== undefined && { secureCookie }) });
            if (token?.email) return token;
        } catch {
            // Try the next cookie name.
        }
    }
    return null;
};

/**
 * Receives browser Firestore read counts (see src/lib/telemetry/clientReads.js)
 * and writes one line per report to the Vercel logs:
 *   [firestore-reads] source=browser reads=40 user=a@b role=teacher path=/calendar detail=shifts:one-off:30,...
 * Reports are logged even when the session can't be read (user=unknown), but
 * only when the browser says they came from this site. Logging never reads Firestore.
 */
// Rejections are logged too, so a report that never shows up can be explained.
const reject = reason => {
    console.warn(`[firestore-reads] source=browser rejected reason=${reason}`);
    return new Response(null, { status: 204 });
};

export async function POST(request) {
    const site = request.headers.get('sec-fetch-site');
    if (site && site !== 'same-origin') return reject(`site-${clean(site)}`);
    try {
        const text = await request.text();
        if (!text) return reject('empty-body');
        const { path, reads } = JSON.parse(text);
        const entries = Object.entries(reads || {})
            .filter(([, count]) => Number.isInteger(count) && count > 0 && count < 1000000)
            .slice(0, MAX_LABELS);
        if (!entries.length) return reject('no-reads');
        const token = await readSession(request);
        const total = entries.reduce((sum, [, count]) => sum + count, 0);
        const detail = entries.sort((a, b) => b[1] - a[1]).map(([label, count]) => `${clean(label)}:${count}`).join(',');
        console.log(`[firestore-reads] source=browser reads=${total} user=${clean(token?.email || 'unknown')} role=${clean(token?.defaultRole || 'unknown')} path=${clean(path || 'unknown')} detail=${detail}`);
    } catch (error) {
        return reject(`invalid-${clean(error?.name || 'error')}`);
    }
    return new Response(null, { status: 204 });
}
