jest.mock('@/lib/security/sanitiseHtml', () => ({ sanitiseHtml: value => value }));
import { msCreateEvent, msGetOccurrenceId, msDeleteOccurrence } from '@/app/api/microsoft/msGraphFunctions';
import { removeSkippedTeamsOccurrences, updateTeamsMeeting } from '@/utils/msTeams';
const json = data => ({ ok: true, json: async () => data });
beforeEach(() => { global.fetch = jest.fn(); });

test('Graph recurrence uses Sydney dates/weekdays and the saved occurrence count across DST', async () => {
    fetch.mockResolvedValue(json({ id: 'series', isOnlineMeeting: true, onlineMeetingProvider: 'teamsForBusiness', onlineMeeting: { joinUrl: 'join-url' } }));
    await msCreateEvent('mock-test-token', { subject: 'Series', startTime: '2026-09-27T23:00:00.000Z', endTime: '2026-09-28T00:00:00.000Z', attendees: [], recurrenceOptions: { recurring: 'weekly', occurenceNum: 3 } });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.start).toEqual({ dateTime: '2026-09-28T09:00:00', timeZone: 'Australia/Sydney' });
    expect(body.recurrence).toEqual({ pattern: { type: 'weekly', interval: 1, daysOfWeek: ['Monday'] }, range: { type: 'endDate', startDate: '2026-09-28', endDate: '2026-10-12', recurrenceTimeZone: 'Australia/Sydney' } });
});
test('an earlier saved until date limits fortnightly Teams recurrence', async () => {
    fetch.mockResolvedValue(json({ id: 'series', isOnlineMeeting: true, onlineMeetingProvider: 'teamsForBusiness', onlineMeeting: { joinUrl: 'join-url' } }));
    await msCreateEvent('mock-test-token', { subject: 'Series', startTime: '2026-10-04T22:00:00Z', endTime: '2026-10-04T23:00:00Z', attendees: [], recurrenceOptions: { recurring: 'fortnightly', occurenceNum: 5, until: '2026-10-18T22:00:00Z' } });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.recurrence.pattern.interval).toBe(2); expect(body.recurrence.range.endDate).toBe('2026-10-19');
});
test('skipped occurrence cleanup uses Sydney wall time, deduplicates dates and tolerates already removed dates', async () => {
    fetch.mockImplementation(async (url, options) => {
        const body = JSON.parse(options.body);
        if (url.includes('get-occurrence-id')) return json({ data: body.occurrenceDate === '2026-09-27T23:00:00.000Z' ? null : 'third-occurrence' });
        return json({ data: true });
    });
    await removeSkippedTeamsOccurrences('series', '2026-09-27T23:00:00.000Z', { recurring: 'weekly', occurenceNum: 3, eventExceptions: [0, 2, 2, 3, -1] }, { allowMissing: true });
    const calls = fetch.mock.calls.map(([url, options]) => [url, JSON.parse(options.body)]);
    expect(calls).toEqual([
        ['/api/microsoft?action=get-occurrence-id', { seriesMasterId: 'series', occurrenceDate: '2026-09-27T23:00:00.000Z', allowMissing: true }],
        ['/api/microsoft?action=get-occurrence-id', { seriesMasterId: 'series', occurrenceDate: '2026-10-11T22:00:00.000Z', allowMissing: true }],
        ['/api/microsoft?action=delete-occurrence', { occurrenceId: 'third-occurrence' }],
    ]);
});
test('updating an existing Teams series reapplies saved skipped dates without creating another series', async () => {
    fetch.mockImplementation(async url => json({ data: url.includes('get-occurrence-id') ? 'skip-id' : { id: 'series' } }));
    await updateTeamsMeeting('series', 'Updated', '', '2026-10-04T22:00:00Z', '2026-10-04T23:00:00Z', [], { recurring: 'weekly', occurenceNum: 3, eventExceptions: [1] });
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(['/api/microsoft?action=update-event', '/api/microsoft?action=get-occurrence-id', '/api/microsoft?action=delete-occurrence']);
});
test('missing cancelled Graph occurrences are optional only for idempotent cleanup', async () => {
    fetch.mockResolvedValue(json({ value: [] }));
    const date = new Date('2026-10-04T22:00:00Z');
    await expect(msGetOccurrenceId('mock-test-token', 'series', date, { allowMissing: true })).resolves.toBeNull();
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.searchParams.get('startDateTime')).toBe('2026-10-04T13:00:00.000Z');
    expect(url.searchParams.get('endDateTime')).toBe('2026-10-05T12:59:59.999Z');
    await expect(msGetOccurrenceId('mock-test-token', 'series', date)).rejects.toThrow('Occurrence not found');
    fetch.mockResolvedValue({ ok: false, status: 404 });
    await expect(msDeleteOccurrence('mock-test-token', 'already-deleted')).resolves.toBe(true);
});

test('fresh series cleanup reports a missing occurrence rather than silently claiming it was cancelled', async () => {
    fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Occurrence not found' }) });
    await expect(removeSkippedTeamsOccurrences('new-series', '2026-10-04T22:00:00Z', { recurring: 'weekly', occurenceNum: 3, eventExceptions: [1] })).rejects.toThrow('Occurrence not found');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).not.toHaveProperty('allowMissing');
});
