const { waitForSchedulingRelease } = require('../../scripts/waitForSchedulingRelease.cjs');
const commit = 'a'.repeat(40);
const response = version => ({ ok: true, json: async () => version });
function clock() { let time = 0; return { now: () => time, pause: jest.fn(async ms => { time += ms; }) }; }
test('rules wait for the exact tested production build and the tab refresh interval', async () => {
    const timing = clock();
    const fetchImpl = jest.fn().mockResolvedValueOnce(response({ gitCommit: 'b'.repeat(40), schedulingApiVersion: 1 })).mockResolvedValue(response({ gitCommit: commit, schedulingApiVersion: 1 }));
    await waitForSchedulingRelease({ commit, fetchImpl, ...timing });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(timing.pause).toHaveBeenLastCalledWith(300_000);
    expect(fetchImpl.mock.calls[0][0]).toMatch(/^https:\/\/talloc.kings.edu.au\/version.json/);
});
test.each([{}, { gitCommit: commit }, { gitCommit: 'b'.repeat(40), schedulingApiVersion: 1 }])('old or incompatible app fails closed: %j', async version => {
    await expect(waitForSchedulingRelease({ commit, fetchImpl: async () => response(version), ...clock(), timeoutMs: 10 })).rejects.toThrow('not deployed');
});
test('network failure and invalid commits never authorise rules deployment', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('offline'));
    await expect(waitForSchedulingRelease({ commit: 'bad', fetchImpl })).rejects.toThrow('commit SHA');
    expect(fetchImpl).not.toHaveBeenCalled();
    await expect(waitForSchedulingRelease({ commit, fetchImpl, ...clock(), timeoutMs: 10 })).rejects.toThrow('not deployed');
});

test('a newer production build during the refresh grace fails closed', async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(response({ gitCommit: commit, schedulingApiVersion: 1 })).mockResolvedValue(response({ gitCommit: 'b'.repeat(40), schedulingApiVersion: 1 }));
    await expect(waitForSchedulingRelease({ commit, fetchImpl, ...clock() })).rejects.toThrow('Production changed');
});
