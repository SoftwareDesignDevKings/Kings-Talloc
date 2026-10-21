/** @jest-environment node */
jest.mock('server-only', () => ({}), { virtual: true });
const mockStore = new Map();
const mockRedis = {
    get: jest.fn(async key => mockStore.get(key) ?? null),
    mget: jest.fn(async (...keys) => keys.map(key => mockStore.get(key) ?? null)),
    set: jest.fn(async (key, value) => { mockStore.set(key, value); return 'OK'; }),
    incr: jest.fn(async key => { const next = Number(mockStore.get(key) || 0) + 1; mockStore.set(key, String(next)); return next; }),
    del: jest.fn(async key => { mockStore.delete(key); return 1; }),
};
jest.mock('@upstash/redis', () => ({ Redis: jest.fn(() => mockRedis) }));
const env = { ...process.env };
// Each require is a separate server instance with its own local layer.
const instance = () => { let cache; jest.isolateModules(() => { cache = require('@/lib/cache/sharedCache'); }); return cache; };
beforeEach(() => {
    process.env.TALLOC_CACHE_TESTS = '1';
    process.env.KV_REST_API_URL = 'https://redis.test'; process.env.KV_REST_API_TOKEN = 'token';
    mockStore.clear(); Object.values(mockRedis).forEach(fn => fn.mockClear());
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { process.env = { ...env }; jest.restoreAllMocks(); });

test('server instances share one load through Redis', async () => {
    const load = jest.fn(async () => ({ tutors: ['tutor@school.test'] }));
    expect(await instance().cached('tutors', 60, load)).toEqual({ tutors: ['tutor@school.test'] });
    expect(await instance().cached('tutors', 60, load)).toEqual({ tutors: ['tutor@school.test'] });
    expect(load).toHaveBeenCalledTimes(1);
    expect(mockRedis.set).toHaveBeenCalledWith('talloc:cache:tutors', expect.any(String), { ex: 60 });
});
test('repeat reads in one instance skip Redis', async () => {
    const cache = instance(), load = jest.fn(async () => 1);
    await cache.cached('key', 60, load); await cache.cached('key', 60, load);
    expect(load).toHaveBeenCalledTimes(1); expect(mockRedis.get).toHaveBeenCalledTimes(1);
});
test('bumping a group drops its entries on every instance', async () => {
    const writer = instance(), reader = instance();
    let value = 'before';
    const load = async () => value;
    expect(await reader.cached('slots', 60, load, { group: 'availability' })).toBe('before');
    value = 'after';
    await writer.bumpCacheGroup('availability');
    expect(await instance().cached('slots', 60, load, { group: 'availability' })).toBe('after');
    // The bumping instance never serves its own stale local copy either.
    await writer.cached('other', 60, async () => 'old', { group: 'availability' });
    await writer.bumpCacheGroup('availability');
    expect(await writer.cached('other', 60, async () => 'new', { group: 'availability' })).toBe('new');
});
test('invalidating a key drops it on every instance', async () => {
    await instance().cached('account:a@school.test', 60, async () => ({ role: 'tutor' }));
    await instance().invalidateCached('account:a@school.test');
    expect(await instance().cached('account:a@school.test', 60, async () => null)).toBeNull();
});
test('dates and Firestore timestamps survive the round trip as dates', async () => {
    const start = new Date('2027-04-06T05:00:00Z');
    await instance().cached('events', 60, async () => [{ start, created: { toDate: () => start }, nested: { list: [start] } }]);
    const [event] = await instance().cached('events', 60, async () => []);
    expect(event.start).toEqual(start); expect(event.created).toEqual(start); expect(event.nested.list[0]).toEqual(start);
});
test('callers cannot mutate the cached copy', async () => {
    const cache = instance();
    (await cache.cached('list', 60, async () => [1, 2])).push(3);
    expect(await cache.cached('list', 60, async () => [])).toEqual([1, 2]);
});
test('a Redis outage falls back to Firestore reads', async () => {
    mockRedis.get.mockRejectedValueOnce(new Error('down')); mockRedis.set.mockRejectedValueOnce(new Error('down'));
    expect(await instance().cached('key', 60, async () => 'fresh')).toBe('fresh');
});
test('without Redis settings the local layer still works', async () => {
    delete process.env.KV_REST_API_URL;
    const cache = instance(), load = jest.fn(async () => 'value');
    await cache.cached('key', 60, load); await cache.cached('key', 60, load);
    expect(load).toHaveBeenCalledTimes(1); expect(mockRedis.get).not.toHaveBeenCalled();
});
test('load errors are not cached', async () => {
    const cache = instance();
    await expect(cache.cached('key', 60, async () => { throw new Error('RESOURCE_EXHAUSTED'); })).rejects.toThrow('RESOURCE_EXHAUSTED');
    expect(await cache.cached('key', 60, async () => 'recovered')).toBe('recovered');
});
test('the health check reports a working Redis round trip', async () => {
    const health = await instance().checkCacheHealth();
    expect(health).toEqual(expect.objectContaining({ configured: true, ok: true }));
    expect([...mockStore.keys()].some(key => key.includes('health'))).toBe(false);
});
test('the health check explains missing settings and Redis errors', async () => {
    mockRedis.set.mockRejectedValueOnce(new Error('WRONGPASS'));
    expect(await instance().checkCacheHealth()).toEqual(expect.objectContaining({ configured: true, ok: false, error: 'WRONGPASS' }));
    delete process.env.KV_REST_API_TOKEN;
    expect(await instance().checkCacheHealth()).toEqual(expect.objectContaining({ configured: false, ok: false }));
});
test('browser tests can turn caching off', async () => {
    process.env.TALLOC_DISABLE_CACHE = '1';
    const load = jest.fn(async () => 'fresh');
    const cache = instance();
    await cache.cached('key', 60, load); await cache.cached('key', 60, load);
    expect(load).toHaveBeenCalledTimes(2); expect(mockRedis.get).not.toHaveBeenCalled();
});
