// The browser loads Canvas classes from the cached server route.
describe('Canvas Classes reference data (browser)', () => {
    let fetchClasses;

    beforeEach(() => {
        // Each test gets a fresh module-level reference cache.
        jest.isolateModules(() => {
            ({ fetchCacheClasses: fetchClasses } = require('@/firestore/firestoreFetch'));
        });
        global.fetch = jest.fn();
    });

    const ok = classes => ({ ok: true, json: async () => ({ classes }) });

    test('loads classes from the reference route', async () => {
        fetch.mockResolvedValueOnce(ok([{ id: '123', name: 'Mathematics', students: [] }]));
        await expect(fetchClasses()).resolves.toEqual([{ id: '123', name: 'Mathematics', students: [] }]);
        expect(fetch).toHaveBeenCalledWith('/api/reference/classes', { cache: 'no-store' });
    });

    test('propagates a failed load and allows a later retry', async () => {
        fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Unable to load classes.' }) });
        await expect(fetchClasses()).rejects.toThrow('Unable to load classes.');
        fetch.mockResolvedValueOnce(ok([{ id: '123', name: 'Recovered class', students: [] }]));
        await expect(fetchClasses()).resolves.toEqual([expect.objectContaining({ name: 'Recovered class' })]);
    });

    test('concurrent cold loads share one request and later calls use the cache', async () => {
        fetch.mockResolvedValue(ok([]));
        await Promise.all([fetchClasses(), fetchClasses()]);
        await fetchClasses();
        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
