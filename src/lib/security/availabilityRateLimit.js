import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const LIMIT = 120, WINDOW = 60000;
const accounts = new Map();
let distributed;
const tooMany = retryAfter => Response.json({ message: 'Availability has refreshed very frequently. Please wait a moment and retry.' },
    { status: 429, headers: { 'Retry-After': String(Math.max(1, retryAfter)), 'Cache-Control': 'no-store' } });

// Per account, only for availability. Typical use refreshes twice per minute.
// Keep a bounded local fallback when Redis is not configured or temporarily fails.
export async function checkAvailabilityRateLimit(email) {
    const now = Date.now(), key = email.toLowerCase();
    for (const [account, state] of accounts) if (state.reset <= now) accounts.delete(account);
    if (!accounts.has(key) && accounts.size >= 10000) return Response.json({ message: 'Availability is busy. Please retry shortly.' }, { status: 503 });
    const state = accounts.get(key) || { count: 0, reset: now + WINDOW };
    accounts.set(key, state);
    if (++state.count > LIMIT) return tooMany(Math.ceil((state.reset - now) / 1000));
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        distributed ||= new Ratelimit({ redis: new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN }),
            limiter: Ratelimit.fixedWindow(LIMIT, '1 m'), prefix: 'talloc:availability', analytics: false });
        try {
            const result = await distributed.limit(key);
            if (!result.success) return tooMany(Math.ceil((result.reset - now) / 1000));
        } catch {
            // Local accounting still applies. An optional Redis outage must not block booking.
            console.warn('Availability limiter is using its local fallback.');
        }
    }
    return null;
}
