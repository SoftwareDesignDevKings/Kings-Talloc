import { getToken } from 'next-auth/jwt';

const MAX_LABELS = 50;
const clean = value => String(value).replace(/[^\w:/.@-]/g, '').slice(0, 120);

/**
 * Receives browser Firestore read counts (see src/lib/telemetry/clientReads.js)
 * and writes one line per report to the Vercel logs:
 *   [firestore-reads] source=browser reads=40 user=a@b role=teacher path=/calendar detail=shifts:one-off:30,...
 * Uses the session cookie only, so logging never reads Firestore itself.
 */
export async function POST(request) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) return new Response(null, { status: 204 });
    try {
        const { path, reads } = await request.json();
        const entries = Object.entries(reads || {})
            .filter(([, count]) => Number.isInteger(count) && count > 0 && count < 1000000)
            .slice(0, MAX_LABELS);
        if (!entries.length) return new Response(null, { status: 204 });
        const total = entries.reduce((sum, [, count]) => sum + count, 0);
        const detail = entries.sort((a, b) => b[1] - a[1]).map(([label, count]) => `${clean(label)}:${count}`).join(',');
        console.log(`[firestore-reads] source=browser reads=${total} user=${clean(token.email)} role=${clean(token.defaultRole || 'unknown')} path=${clean(path || 'unknown')} detail=${detail}`);
    } catch {
        // Malformed reports are ignored.
    }
    return new Response(null, { status: 204 });
}
