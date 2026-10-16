/** @jest-environment node */
jest.mock('server-only', () => ({}), { virtual: true });
const mockDistributedLimit = jest.fn();
jest.mock('@upstash/ratelimit', () => ({ Ratelimit: Object.assign(jest.fn().mockImplementation(() => ({ limit: mockDistributedLimit })), { fixedWindow: jest.fn() }) }));
jest.mock('@upstash/redis', () => ({ Redis: jest.fn() }));
let limit;
const env = { ...process.env };
beforeEach(() => {
    jest.resetModules(); jest.useFakeTimers(); jest.setSystemTime(new Date('2027-01-01T00:00:00Z'));
    delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
    mockDistributedLimit.mockReset();
    limit = require('@/lib/security/availabilityRateLimit').checkAvailabilityRateLimit;
});
afterEach(() => { jest.useRealTimers(); process.env = { ...env }; });
test('allows 120 requests per account per minute, independent of shared network or other accounts', async () => {
    for (let i = 0; i < 120; i++) expect(await limit('one@school.test')).toBeNull();
    const response = await limit('ONE@school.test'); expect(response.status).toBe(429); expect(response.headers.get('retry-after')).toBe('60');
    expect(await limit('two@school.test')).toBeNull();
    jest.advanceTimersByTime(60000); expect(await limit('one@school.test')).toBeNull();
});
test('uses the distributed account limit when configured', async () => {
    process.env.KV_REST_API_URL = 'https://redis.test'; process.env.KV_REST_API_TOKEN = 'dummy';
    mockDistributedLimit.mockResolvedValue({ success: false, reset: Date.now() + 5000 });
    const response = await limit('one@school.test'); expect(response.status).toBe(429); expect(response.headers.get('retry-after')).toBe('5');
    expect(mockDistributedLimit).toHaveBeenCalledWith('one@school.test');
});
test('Redis outage keeps the local limit and normal booking refreshes working', async () => {
    process.env.KV_REST_API_URL = 'https://redis.test'; process.env.KV_REST_API_TOKEN = 'dummy';
    mockDistributedLimit.mockRejectedValue(new Error('Offline'));
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    for (let i = 0; i < 120; i++) expect(await limit('one@school.test')).toBeNull();
    expect((await limit('one@school.test')).status).toBe(429);
    console.warn.mockRestore();
});
