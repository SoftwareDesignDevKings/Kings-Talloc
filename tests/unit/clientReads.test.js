let recordSnapshotReads, recordGetReads, send;
const querySnapshot = (changes, metadata = {}) => ({ metadata, docChanges: () => Array.from({ length: changes }) });

beforeEach(() => {
    jest.useFakeTimers();
    send = jest.fn(() => Promise.resolve({ ok: true }));
    global.fetch = send;
    jest.isolateModules(() => ({ recordSnapshotReads, recordGetReads } = require('@/lib/telemetry/clientReads')));
});
afterEach(() => jest.useRealTimers());

const sentReport = async () => JSON.parse(send.mock.calls[0][1].body);

test('counts server-sent documents and reports them once a minute', async () => {
    recordSnapshotReads('shifts:one-off', querySnapshot(12));
    recordSnapshotReads('shifts:one-off', querySnapshot(2));
    recordSnapshotReads('shifts:one-off', querySnapshot(40, { fromCache: true }));
    recordSnapshotReads('shifts:one-off', querySnapshot(1, { hasPendingWrites: true }));
    recordSnapshotReads('users:own', { metadata: {}, data: () => ({}) });
    recordGetReads('users:welcome-flag', { exists: () => true });
    recordGetReads('shifts:hours', { size: 0 });
    expect(send).not.toHaveBeenCalled();
    jest.advanceTimersByTime(60000);
    expect(send).toHaveBeenCalledWith('/api/telemetry/reads', expect.objectContaining({ method: 'POST', keepalive: true }));
    expect(await sentReport()).toEqual({ path: '/', reads: { 'shifts:one-off': 14, 'users:own': 1, 'users:welcome-flag': 1, 'shifts:hours': 1 } });
});

test('reports nothing when no reads happened', () => {
    recordSnapshotReads('shifts:one-off', querySnapshot(5, { fromCache: true }));
    jest.advanceTimersByTime(120000);
    window.dispatchEvent(new Event('pagehide'));
    expect(send).not.toHaveBeenCalled();
});

test('leaving the page sends what has been counted so far', async () => {
    recordSnapshotReads('tutorAvailabilities', querySnapshot(3));
    window.dispatchEvent(new Event('pagehide'));
    expect(await sentReport()).toEqual({ path: '/', reads: { tutorAvailabilities: 3 } });
});
