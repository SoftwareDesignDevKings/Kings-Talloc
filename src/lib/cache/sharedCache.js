import 'server-only';
import { Redis } from '@upstash/redis';

// Shared read-through cache. Redis (the existing Upstash/Vercel KV store) shares
// entries across server instances; a short in-process layer avoids a Redis call
// for repeated reads in one instance. Any cache failure falls back to Firestore.
const PREFIX = 'talloc:cache:';
const LOCAL_TTL_MS = 5000;
const MAX_ENTRY_BYTES = 900000;
const local = new Map();
const localVersions = new Map();
let redis;
let warned = false;

// Unit tests read fresh data unless a test opts in to exercise the cache itself.
// Browser tests seed the emulator and assert at once, so they turn caching off.
const disabled = () => process.env.TALLOC_DISABLE_CACHE === '1'
    || (process.env.NODE_ENV === 'test' && process.env.TALLOC_CACHE_TESTS !== '1');
const client = () => {
    if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
    redis ||= new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN, automaticDeserialization: false });
    return redis;
};
const warn = error => {
    if (!warned) console.warn('Shared cache unavailable, reading Firestore directly:', error?.message || error);
    warned = true;
};

// Dates and Firestore Timestamps round-trip as Dates.
export const encode = value => JSON.stringify(value, function (key, raw) {
    const original = this[key];
    if (original instanceof Date) return { $date: original.toISOString() };
    if (typeof original?.toDate === 'function') return { $date: original.toDate().toISOString() };
    return raw;
});
export const decode = text => JSON.parse(text, (key, value) =>
    value && typeof value === 'object' && Object.keys(value).length === 1 && typeof value.$date === 'string' ? new Date(value.$date) : value);

// Local entries are stored encoded so callers can never mutate a shared copy.
const readLocal = (key, version) => {
    const entry = local.get(key);
    if (!entry || entry.expires <= Date.now() || entry.version !== version) { local.delete(key); return undefined; }
    return { data: decode(entry.text) };
};
const writeLocal = (key, version, data) => {
    if (local.size >= 500) for (const [name, entry] of local) if (entry.expires <= Date.now() || local.size >= 500) local.delete(name);
    local.set(key, { version, text: encode(data), expires: Date.now() + LOCAL_TTL_MS });
};

/**
 * Read `key` from the cache, or run `load` and store its result for `ttlSeconds`.
 * With a `group`, entries are dropped as soon as bumpCacheGroup(group) runs.
 */
export async function cached(key, ttlSeconds, load, { group } = {}) {
    if (disabled()) return load();
    const dataKey = PREFIX + key;
    const versionKey = group && `${PREFIX}version:${group}`;
    const localVersion = group ? localVersions.get(group) || 0 : 0;
    const hit = readLocal(dataKey, localVersion);
    if (hit) return hit.data;

    const redisClient = client();
    let version = '0';
    if (redisClient) {
        try {
            const [storedVersion, stored] = versionKey ? await redisClient.mget(versionKey, dataKey) : [null, await redisClient.get(dataKey)];
            version = String(storedVersion || '0');
            if (stored) {
                const entry = decode(stored);
                if (entry.version === version) {
                    writeLocal(dataKey, localVersion, entry.data);
                    return entry.data;
                }
            }
        } catch (error) {
            warn(error);
        }
    }

    const data = await load();
    writeLocal(dataKey, localVersion, data);
    if (redisClient) {
        const text = encode({ version, data });
        if (text.length <= MAX_ENTRY_BYTES) {
            try { await redisClient.set(dataKey, text, { ex: ttlSeconds }); } catch (error) { warn(error); }
        }
    }
    return data;
}

/** Drop every entry cached under `group`, on all instances. */
export async function bumpCacheGroup(group) {
    localVersions.set(group, (localVersions.get(group) || 0) + 1);
    const redisClient = client();
    if (!redisClient) return;
    try { await redisClient.incr(`${PREFIX}version:${group}`); } catch (error) { warn(error); }
}

/** Live Redis round trip, so admins can confirm the shared cache works in production. */
export async function checkCacheHealth() {
    const redisClient = client();
    if (!redisClient) return { configured: false, ok: false, error: 'KV_REST_API_URL / KV_REST_API_TOKEN are not set.' };
    const key = `${PREFIX}health:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const started = Date.now();
    try {
        await redisClient.set(key, 'ok', { ex: 60 });
        const value = await redisClient.get(key);
        await redisClient.del(key);
        return { configured: true, ok: value === 'ok', latencyMs: Date.now() - started, ...(value !== 'ok' && { error: 'Read back a different value.' }) };
    } catch (error) {
        return { configured: true, ok: false, latencyMs: Date.now() - started, error: error?.message || String(error) };
    }
}

/** Drop one entry, on all instances. */
export async function invalidateCached(key) {
    local.delete(PREFIX + key);
    const redisClient = client();
    if (!redisClient) return;
    try { await redisClient.del(PREFIX + key); } catch (error) { warn(error); }
}
