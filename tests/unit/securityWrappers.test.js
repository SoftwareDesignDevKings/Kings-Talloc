jest.mock('@upstash/ratelimit', () => {
    const limit = jest.fn();
    const MockRatelimit = jest.fn().mockImplementation(() => ({
        limit,
    }));
    MockRatelimit.slidingWindow = jest.fn();
    MockRatelimit.__limit = limit;

    return { Ratelimit: MockRatelimit };
});

jest.mock('@upstash/redis', () => ({
    Redis: jest.fn(),
}));

jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn(),
        rewrite: jest.fn(),
    },
}));

const { Ratelimit } = require('@upstash/ratelimit');
const { implementRateLimiterWrapper } = require('@/lib/security/securityWrappers');

const mockLimit = Ratelimit.__limit;

describe('implementRateLimiterWrapper', () => {
    const originalKvUrl = process.env.KV_REST_API_URL;
    const originalKvToken = process.env.KV_REST_API_TOKEN;

    beforeEach(() => {
        mockLimit.mockClear();
        process.env.KV_REST_API_URL = originalKvUrl;
        process.env.KV_REST_API_TOKEN = originalKvToken;
    });

    afterAll(() => {
        process.env.KV_REST_API_URL = originalKvUrl;
        process.env.KV_REST_API_TOKEN = originalKvToken;
    });

    it.each(['/api/auth', '/api/auth/session', '/api/auth/_log'])(
        'exempts NextAuth endpoint %s from rate limiting',
        async (pathname) => {
            await expect(implementRateLimiterWrapper({}, pathname)).resolves.toBeNull();
            expect(mockLimit).not.toHaveBeenCalled();
        },
    );

    it('keeps similarly named API routes rate limited', async () => {
        process.env.KV_REST_API_URL = 'https://example.upstash.io';
        process.env.KV_REST_API_TOKEN = 'token';
        mockLimit.mockResolvedValue({
            success: true,
            limit: 10,
            reset: Date.now(),
            remaining: 9,
        });

        const req = {
            headers: { get: jest.fn(() => null) },
            ip: '203.0.113.10',
        };

        await expect(implementRateLimiterWrapper(req, '/api/authenticate')).resolves.toBeNull();
        expect(mockLimit).toHaveBeenCalledWith('203.0.113.10');
    });
});
