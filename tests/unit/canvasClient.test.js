/** @jest-environment node */

const { CanvasClient } = require('@/lib/canvas/canvasClient');

const response = (status, headers = {}, body = []) => ({
    status,
    ok: status >= 200 && status < 300,
    headers: { get: name => headers[name.toLowerCase()] ?? null },
    json: async () => body,
    text: async () => '',
});
const client = fetchImpl => new CanvasClient({ apiUrl: 'https://canvas.test', token: 'token', fetchImpl });

describe('CanvasClient', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    test('backs off before retrying when Canvas throttles without a Retry-After header', async () => {
        const fetchImpl = jest.fn()
            .mockResolvedValueOnce(response(429))
            .mockResolvedValueOnce(response(200));
        const request = client(fetchImpl).request('/api/v1/courses');

        // An immediate retry would hit the same throttle and fail the whole sync.
        await jest.advanceTimersByTimeAsync(499);
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        await jest.advanceTimersByTimeAsync(1);
        await expect(request).resolves.toMatchObject({ status: 200 });
        expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    test('waits for the time Canvas asks for when it sends Retry-After', async () => {
        const fetchImpl = jest.fn()
            .mockResolvedValueOnce(response(429, { 'retry-after': '2' }))
            .mockResolvedValueOnce(response(200));
        const request = client(fetchImpl).request('/api/v1/courses');

        await jest.advanceTimersByTimeAsync(1999);
        expect(fetchImpl).toHaveBeenCalledTimes(1);
        await jest.advanceTimersByTimeAsync(1);
        await expect(request).resolves.toMatchObject({ status: 200 });
    });

    test('asks Canvas for rosters without grades', async () => {
        const fetchImpl = jest.fn().mockResolvedValue(response(200));
        await client(fetchImpl).listStudentEnrollments(42);

        const url = fetchImpl.mock.calls[0][0];
        expect(url.searchParams.getAll('include[]')).toEqual(['email']);
    });
});
