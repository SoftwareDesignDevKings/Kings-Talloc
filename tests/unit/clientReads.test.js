let recordSnapshotReads, recordGetReads, sendBeacon;
const querySnapshot = (changes, metadata = {}) => ({ metadata, docChanges: () => Array.from({ length: changes }) });

beforeEach(() => {
    jest.useFakeTimers();
    // jsdom's Blob can't be read back; keep the report text instead.
    global.Blob = class { constructor(parts, options) { this.text = parts.join(''); this.type = options?.type; } };
    sendBeacon = jest.fn(() => true);
    Object.defineProperty(navigator, 'sendBeacon', { value: sendBeacon, configurable: true });
    jest.isolateModules(() => ({ recordSnapshotReads, recordGetReads } = require('@/lib/telemetry/clientReads')));
});
afterEach(() => jest.useRealTimers());

const sentReport = async () => JSON.parse(sendBeacon.mock.calls[0][1].text);

test('counts server-sent documents and reports them once a minute', async () => {
    recordSnapshotReads('shifts:one-off', querySnapshot(12));
    recordSnapshotReads('shifts:one-off', querySnapshot(2));
    recordSnapshotReads('shifts:one-off', querySnapshot(40, { fromCache: true }));
    recordSnapshotReads('shifts:one-off', querySnapshot(1, { hasPendingWrites: true }));
    recordSnapshotReads('users:own', { metadata: {}, data: () => ({}) });
    recordGetReads('users:welcome-flag', { exists: () => true });
    recordGetReads('shifts:hours', { size: 0 });
    expect(sendBeacon).not.toHaveBeenCalled();
    jest.advanceTimersByTime(60000);
    expect(sendBeacon).toHaveBeenCalledWith('/api/telemetry/reads', expect.objectContaining({ type: 'application/json' }));
    expect(await sentReport()).toEqual({ path: '/', reads: { 'shifts:one-off': 14, 'users:own': 1, 'users:welcome-flag': 1, 'shifts:hours': 1 } });
});

test('reports nothing when no reads happened', () => {
    recordSnapshotReads('shifts:one-off', querySnapshot(5, { fromCache: true }));
    jest.advanceTimersByTime(120000);
    window.dispatchEvent(new Event('pagehide'));
    expect(sendBeacon).not.toHaveBeenCalled();
});

test('leaving the page sends what has been counted so far', async () => {
    recordSnapshotReads('tutorAvailabilities', querySnapshot(3));
    window.dispatchEvent(new Event('pagehide'));
    expect(await sentReport()).toEqual({ path: '/', reads: { tutorAvailabilities: 3 } });
});
