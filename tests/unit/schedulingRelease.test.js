const { waitForSchedulingRelease } = require('../../scripts/waitForSchedulingRelease.cjs');
const commit = 'a'.repeat(40);
const clientMigrationAck = 'server-writes-v1';
const response = version => ({ ok: true, json: async () => version });
function clock() { let time = 0; return { now: () => time, pause: jest.fn(async ms => { time += ms; }) }; }
test('rules wait for the exact tested production build and the tab refresh interval', async () => {
    const timing = clock();
    const fetchImpl = jest.fn().mockResolvedValueOnce(response({ gitCommit: 'b'.repeat(40), schedulingApiVersion: 1 })).mockResolvedValue(response({ gitCommit: commit, schedulingApiVersion: 1 }));
    await waitForSchedulingRelease({ commit, clientMigrationAck, fetchImpl, ...timing });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(timing.pause).toHaveBeenLastCalledWith(300_000);
    expect(fetchImpl.mock.calls[0][0]).toMatch(/^https:\/\/talloc.kings.edu.au\/version.json/);
});
test.each([{}, { gitCommit: commit }, { gitCommit: 'b'.repeat(40), schedulingApiVersion: 1 }])('old or incompatible app fails closed: %j', async version => {
    await expect(waitForSchedulingRelease({ commit, clientMigrationAck, fetchImpl: async () => response(version), ...clock(), timeoutMs: 10 })).rejects.toThrow('not deployed');
});
test('network failure and invalid commits never authorise rules deployment', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('offline'));
    await expect(waitForSchedulingRelease({ commit: 'bad', clientMigrationAck, fetchImpl })).rejects.toThrow('commit SHA');
    expect(fetchImpl).not.toHaveBeenCalled();
    await expect(waitForSchedulingRelease({ commit, clientMigrationAck, fetchImpl, ...clock(), timeoutMs: 10 })).rejects.toThrow('not deployed');
});

test('a newer production build during the refresh grace fails closed', async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(response({ gitCommit: commit, schedulingApiVersion: 1 })).mockResolvedValue(response({ gitCommit: 'b'.repeat(40), schedulingApiVersion: 1 }));
    await expect(waitForSchedulingRelease({ commit, clientMigrationAck, fetchImpl, ...clock() })).rejects.toThrow('Production changed');
});

test.each([undefined, '', 'true', 'server-writes-v0'])('unconfirmed first-rollout migration fails before any production check: %s', async acknowledgement => {
    const fetchImpl = jest.fn().mockResolvedValue(response({ gitCommit: commit, schedulingApiVersion: 1 }));
    await expect(waitForSchedulingRelease({ commit, clientMigrationAck: acknowledgement, fetchImpl, ...clock() })).rejects.toThrow('Legacy client migration is not confirmed');
    expect(fetchImpl).not.toHaveBeenCalled();
});


test('compatible notices can follow the exact live app without certifying legacy client migration', async () => {
    const timing = clock();
    const fetchImpl = jest.fn().mockResolvedValue(response({ gitCommit: commit, schedulingApiVersion: 1 }));
    await waitForSchedulingRelease({ commit, rulesStage: 'compatibility', fetchImpl, ...timing });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(timing.pause).toHaveBeenCalledWith(300000);
});
test('compatible notices cannot publish before the exact tested app', async () => {
    await expect(waitForSchedulingRelease({ commit, rulesStage: 'compatibility',
        fetchImpl: async () => response({ gitCommit: 'b'.repeat(40), schedulingApiVersion: 1 }),
        ...clock(), timeoutMs: 10 })).rejects.toThrow('not deployed');
});
test.each(['server-writes-v1', 'typo'])('compatibility stage rejects an acknowledged or invalid migration: %s', async clientMigrationAck => {
    const fetchImpl = jest.fn();
    await expect(waitForSchedulingRelease({ commit, rulesStage: 'compatibility', clientMigrationAck, fetchImpl })).rejects.toThrow('unset migration');
    expect(fetchImpl).not.toHaveBeenCalled();
});
