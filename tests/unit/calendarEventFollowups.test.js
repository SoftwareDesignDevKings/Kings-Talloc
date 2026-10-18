import { calendarEventHandleDelete, calendarEventUpdateTeamsMeeting, calendarEventCreateTeamsMeeting } from '@/utils/calendarEvent';
import { deleteEventFromFirestore, removeEmailNotification, updateEventInFirestore } from '@/firestore/firestoreOperations';
import { getTeamsMeetingOccurrenceId, updateTeamsMeetingOccurrence, updateTeamsMeeting, createTeamsMeeting, removeSkippedTeamsOccurrences } from '@/utils/msTeams';
jest.mock('@/firestore/firestoreOperations', () => ({ deleteEventFromFirestore: jest.fn(), removeEmailNotification: jest.fn(), updateEventInFirestore: jest.fn() }));
jest.mock('@/utils/msTeams', () => ({ getTeamsMeetingOccurrenceId: jest.fn(), updateTeamsMeetingOccurrence: jest.fn(), updateTeamsMeeting: jest.fn(), createTeamsMeeting: jest.fn(), removeSkippedTeamsOccurrences: jest.fn() }));
beforeEach(() => jest.clearAllMocks());
test('deleting all from an expanded occurrence deletes the actual series', async () => {
    const setAllEvents = jest.fn(), addAlert = jest.fn();
    await calendarEventHandleDelete({ id: 'series_occurrence_2', recurringEventId: 'series', recurring: 'weekly' }, 'all', { setAllEvents, addAlert });
    expect(deleteEventFromFirestore).toHaveBeenCalledWith('series', 'shifts');
    expect(removeEmailNotification).toHaveBeenCalledWith('series');
    expect(setAllEvents.mock.calls[0][0]([{ id: 'series' }, { id: 'series_occurrence_1', recurringEventId: 'series' }, { id: 'other' }])).toEqual([{ id: 'other' }]);
});
test('moving a recurring instance updates its Teams occurrence rather than the series', async () => {
    getTeamsMeetingOccurrenceId.mockResolvedValue('meeting-occurrence');
    const oldStart = new Date('2027-04-06T05:00Z'), start = new Date('2027-04-06T06:00Z'), end = new Date('2027-04-06T07:00Z');
    await calendarEventUpdateTeamsMeeting({ teamsEventId: 'meeting-series', isRecurringInstance: true, start: oldStart, title: 'Session' }, start, end, false, false, { addAlert: jest.fn() });
    expect(getTeamsMeetingOccurrenceId).toHaveBeenCalledWith('meeting-series', oldStart);
    expect(updateTeamsMeetingOccurrence).toHaveBeenCalledWith('meeting-occurrence', 'Session', '', start.toISOString(), end.toISOString(), []);
    expect(updateTeamsMeeting).not.toHaveBeenCalled();
});

test('Teams creation retains skipped dates and stores its series ID before occurrence cleanup', async () => {
    createTeamsMeeting.mockResolvedValue({ teamsEventId: 'teams-series', joinUrl: 'meeting-url' });
    updateEventInFirestore.mockResolvedValue(); removeSkippedTeamsOccurrences.mockResolvedValue();
    const event = { title: 'Saved series', start: new Date('2026-10-12T22:00:00Z'), end: new Date('2026-10-13T00:00:00Z'), recurring: 'weekly', occurenceNum: 4, eventExceptions: [0, 2], staff: [], students: [], createTeamsMeeting: true };
    await calendarEventCreateTeamsMeeting('saved-id', event, { addAlert: jest.fn() });
    const recurrence = createTeamsMeeting.mock.calls[0][5];
    expect(recurrence).toMatchObject({ recurring: 'weekly', occurenceNum: 4, eventExceptions: [0, 2] });
    expect(updateEventInFirestore).toHaveBeenCalledWith('saved-id', { teamsEventId: 'teams-series', teamsJoinUrl: 'meeting-url' });
    expect(removeSkippedTeamsOccurrences).toHaveBeenCalledWith('teams-series', event.start.toISOString(), recurrence);
    expect(updateEventInFirestore.mock.invocationCallOrder[0]).toBeLessThan(removeSkippedTeamsOccurrences.mock.invocationCallOrder[0]);
});
test('failed Teams cleanup preserves the saved series ID and reports a follow-up failure', async () => {
    createTeamsMeeting.mockResolvedValue({ teamsEventId: 'teams-series', joinUrl: 'meeting-url' });
    updateEventInFirestore.mockResolvedValue(); removeSkippedTeamsOccurrences.mockRejectedValue(new Error('Cleanup failed'));
    const addAlert = jest.fn();
    await calendarEventCreateTeamsMeeting('saved-id', { title: 'Series', start: new Date(), end: new Date(), createTeamsMeeting: true }, { addAlert });
    expect(updateEventInFirestore).toHaveBeenCalled(); expect(createTeamsMeeting).toHaveBeenCalledTimes(1);
    expect(addAlert).toHaveBeenCalledWith('error', expect.stringContaining('Cleanup failed'));
});
