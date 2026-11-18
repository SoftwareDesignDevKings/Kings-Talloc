/** @jest-environment node */

jest.mock('@/lib/security/sanitiseHtml', () => ({
    sanitiseHtml: (html) => require('sanitize-html')(html),
}));

const { msCreateEvent, msUpdateEvent, msUpdateOccurrence, msDeleteEvent } = require('@/app/api/microsoft/msGraphFunctions');

const joinUrl = 'https://teams.microsoft.com/l/meetup-join/test-meeting';
const teamsBlock = `<div class="me-email-text" style="color: #242424"><h2>Microsoft Teams</h2><a href="${joinUrl}">Join the meeting now</a><span data-meeting-id="123">Meeting ID: 123</span><a href="https://teams.microsoft.com/meetingOptions/?id=123">Meeting options</a></div>`;
const eventData = {
    subject: 'Staff meeting',
    description: '<p>Updated notes</p><script>alert(1)</script>',
    startTime: '2026-10-19T02:00:00.000Z',
    endTime: '2026-10-19T03:00:00.000Z',
    attendees: ['teacher@example.edu'],
};
const onlineEvent = (overrides = {}) => ({
    id: 'microsoft-event-id',
    isOnlineMeeting: true,
    onlineMeetingProvider: 'teamsForBusiness',
    onlineMeeting: { joinUrl },
    body: { contentType: 'html', content: `<html><body><p>Old notes</p>${teamsBlock}</body></html>` },
    ...overrides,
});
const graphResponse = (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
});
const patchBody = () => JSON.parse(fetch.mock.calls.find(([, request]) => request.method === 'PATCH')[1].body);

describe('Microsoft calendar Teams meetings', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => jest.restoreAllMocks());

    it('creates a native Teams calendar event with sanitised notes', async () => {
        fetch.mockResolvedValueOnce(graphResponse(onlineEvent(), 201));

        await expect(msCreateEvent('access-token', eventData)).resolves.toEqual({
            teamsEventId: 'microsoft-event-id', joinUrl,
        });

        const [url, request] = fetch.mock.calls[0];
        const body = JSON.parse(request.body);
        expect(url).toBe('https://graph.microsoft.com/v1.0/me/events');
        expect(request.method).toBe('POST');
        expect(body).toMatchObject({ isOnlineMeeting: true, onlineMeetingProvider: 'teamsForBusiness' });
        expect(body.body.content).toContain('<p>Updated notes</p>');
        expect(body.body.content).not.toContain('<script>');
    });

    it('re-reads the created event if Microsoft has not returned its join details yet', async () => {
        fetch.mockResolvedValueOnce(graphResponse(onlineEvent({ onlineMeeting: null }), 201))
            .mockResolvedValueOnce(graphResponse(onlineEvent()));

        await expect(msCreateEvent('access-token', eventData)).resolves.toEqual({
            teamsEventId: 'microsoft-event-id', joinUrl,
        });
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(fetch.mock.calls[1][0]).toContain('/me/events/microsoft-event-id');
        expect(fetch.mock.calls[1][1].method).toBe('GET');
    });

    it('does not report success when Microsoft creates an ordinary event without Teams', async () => {
        const offlineEvent = onlineEvent({ isOnlineMeeting: false, onlineMeetingProvider: 'unknown', onlineMeeting: null });
        fetch.mockResolvedValue(graphResponse(offlineEvent, 201));

        await expect(msCreateEvent('access-token', eventData)).rejects.toThrow(/calendar event.*created.*Teams/i);
        expect(fetch.mock.calls.filter(([, request]) => request.method === 'POST')).toHaveLength(1);
    });

    it.each([
        ['a meeting or series', msUpdateEvent],
        ['a recurring occurrence', msUpdateOccurrence],
    ])('preserves Microsoft Teams markup when updating %s', async (_label, update) => {
        fetch.mockResolvedValueOnce(graphResponse(onlineEvent()))
            .mockResolvedValueOnce(graphResponse(onlineEvent()));

        await update('access-token', 'microsoft-event-id', eventData);

        expect(fetch.mock.calls[0][1].method).toBe('GET');
        expect(fetch.mock.calls[0][1].headers.Prefer).toBe('outlook.body-content-type="html"');
        const body = patchBody();
        expect(body.body.content).toContain(teamsBlock);
        expect(body.body.content).toContain('<p>Updated notes</p>');
        expect(body.body.content).not.toContain('Old notes');
        expect(body.body.content).not.toContain('<script>');
        expect(body).toMatchObject({ subject: eventData.subject, start: { dateTime: eventData.startTime } });
    });

    it('replaces only the app notes on repeated saves, keeping the full Microsoft body', async () => {
        const firstEvent = onlineEvent({
            body: { contentType: 'html', content: `<html><head><style>.me-email-text{color:black}</style></head><body><div id="talloc-event-description"><p>Old notes</p></div>${teamsBlock}<p>Microsoft footer</p></body></html>` },
        });
        fetch.mockResolvedValueOnce(graphResponse(firstEvent)).mockResolvedValueOnce(graphResponse(onlineEvent()));
        await msUpdateEvent('access-token', 'microsoft-event-id', eventData);
        const firstContent = patchBody().body.content;
        expect(firstContent).toBe(firstEvent.body.content.replace('<p>Old notes</p>', '<p>Updated notes</p>'));

        fetch.mockReset();
        fetch.mockResolvedValueOnce(graphResponse(onlineEvent({ body: { contentType: 'html', content: firstContent } })))
            .mockResolvedValueOnce(graphResponse(onlineEvent()));
        await msUpdateEvent('access-token', 'microsoft-event-id', { ...eventData, description: '' });
        expect(patchBody().body.content).toContain(teamsBlock);
        expect(patchBody().body.content).not.toContain('Updated notes');
        expect(patchBody().body.content.match(/id="talloc-event-description"/g)).toHaveLength(1);
    });

    it('keeps unrecognised Microsoft HTML intact instead of risking removal of join details', async () => {
        const originalContent = `<html><body><section><p>Original notes</p><a href="${joinUrl}">Join Teams</a><p>Dial-in details</p></section></body></html>`;
        fetch.mockResolvedValueOnce(graphResponse(onlineEvent({ body: { contentType: 'html', content: originalContent } })))
            .mockResolvedValueOnce(graphResponse(onlineEvent()));

        await msUpdateEvent('access-token', 'microsoft-event-id', eventData);

        expect(patchBody().body.content).toContain(originalContent.match(/<section>.*<\/section>/)[0]);
        expect(patchBody().body.content).toContain('<p>Updated notes</p>');
    });

    it('does not send a destructive PATCH if reading the existing event fails', async () => {
        fetch.mockResolvedValueOnce(graphResponse({ error: { message: 'Access denied' } }, 403));

        await expect(msUpdateEvent('access-token', 'microsoft-event-id', eventData)).rejects.toThrow('Access denied');
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch.mock.calls[0][1].method).toBe('GET');
    });

    it.each([
        undefined,
        { contentType: 'text', content: `Join Teams: ${joinUrl}` },
        { contentType: 'html' },
    ])('does not overwrite join details when Microsoft omits the HTML body (%j)', async (body) => {
        fetch.mockResolvedValueOnce(graphResponse(onlineEvent({ body })));

        await expect(msUpdateEvent('access-token', 'microsoft-event-id', eventData)).rejects.toThrow(/left unchanged/);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('handles Outlook-prefixed description IDs without duplicating notes', async () => {
        fetch.mockResolvedValueOnce(graphResponse(onlineEvent({
            body: { contentType: 'html', content: `<div id="x_talloc-event-description"><p>Old notes</p></div>${teamsBlock}` },
        }))).mockResolvedValueOnce(graphResponse(onlineEvent()));

        await msUpdateOccurrence('access-token', 'microsoft-event-id', eventData);

        expect(patchBody().body.content).toContain(teamsBlock);
        expect(patchBody().body.content).not.toContain('Old notes');
        expect(patchBody().body.content.match(/talloc-event-description/g)).toHaveLength(1);
    });
});

// A session detached from a recurring series keeps the series' event ID.
describe('single sessions that hold a series ID', () => {
    const base = 'https://graph.microsoft.com/v1.0/me/events';
    const occurrenceStart = '2026-10-26T02:00:00.000Z';
    const calls = method => fetch.mock.calls.filter(([, request]) => request.method === method).map(([url]) => url);

    beforeEach(() => {
        global.fetch = jest.fn();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => jest.restoreAllMocks());

    it('updates only that day\'s occurrence, never the series', async () => {
        fetch.mockResolvedValueOnce(graphResponse(onlineEvent({ id: 'series', type: 'seriesMaster' })))
            .mockResolvedValueOnce(graphResponse({ value: [{ id: 'occurrence' }] }))
            .mockResolvedValueOnce(graphResponse(onlineEvent({ id: 'occurrence', type: 'occurrence' })))
            .mockResolvedValueOnce(graphResponse(onlineEvent({ id: 'occurrence' })));

        await msUpdateEvent('access-token', 'series', { ...eventData, occurrenceStart });

        expect(fetch.mock.calls[1][0]).toContain(`${base}/series/instances?startDateTime=`);
        expect(calls('PATCH')).toEqual([`${base}/occurrence`]);
        expect(patchBody()).not.toHaveProperty('recurrence');
    });

    it('refuses to change a series when the session\'s day is unknown', async () => {
        fetch.mockResolvedValueOnce(graphResponse(onlineEvent({ id: 'series', type: 'seriesMaster' })));

        await expect(msUpdateEvent('access-token', 'series', eventData)).rejects.toThrow(/recurring Teams series/);
        expect(calls('PATCH')).toEqual([]);
    });

    it('still updates a whole series when the app saves it as recurring', async () => {
        fetch.mockResolvedValueOnce(graphResponse(onlineEvent({ id: 'series', type: 'seriesMaster' })))
            .mockResolvedValueOnce(graphResponse(onlineEvent({ id: 'series' })));

        await msUpdateEvent('access-token', 'series', { ...eventData, recurrenceOptions: { recurring: 'weekly', occurenceNum: 4 } });

        expect(calls('PATCH')).toEqual([`${base}/series`]);
    });

    it('deletes only that day\'s occurrence, never the series', async () => {
        fetch.mockResolvedValueOnce(graphResponse({ type: 'seriesMaster' }))
            .mockResolvedValueOnce(graphResponse({ value: [{ id: 'occurrence' }] }))
            .mockResolvedValueOnce(graphResponse({}, 204));

        await expect(msDeleteEvent('access-token', 'series', { occurrenceStart })).resolves.toBe(true);

        expect(calls('DELETE')).toEqual([`${base}/occurrence`]);
    });

    it('refuses to delete a series without an explicit series delete', async () => {
        fetch.mockResolvedValueOnce(graphResponse({ type: 'seriesMaster' }));

        await expect(msDeleteEvent('access-token', 'series')).rejects.toThrow(/recurring Teams series/);
        expect(calls('DELETE')).toEqual([]);
    });

    it('deletes a whole series only when asked to', async () => {
        fetch.mockResolvedValueOnce(graphResponse({}, 204));

        await msDeleteEvent('access-token', 'series', { series: true });

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(calls('DELETE')).toEqual([`${base}/series`]);
    });

    it('deletes an ordinary single meeting as before', async () => {
        fetch.mockResolvedValueOnce(graphResponse({ type: 'singleInstance' })).mockResolvedValueOnce(graphResponse({}, 204));

        await msDeleteEvent('access-token', 'meeting', { occurrenceStart });

        expect(calls('DELETE')).toEqual([`${base}/meeting`]);
    });

    it('treats an already removed meeting as deleted', async () => {
        fetch.mockResolvedValueOnce(graphResponse({ error: { message: 'Not found' } }, 404));

        await expect(msDeleteEvent('access-token', 'gone', { occurrenceStart })).resolves.toBe(true);
        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
