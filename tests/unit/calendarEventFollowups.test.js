import { calendarEventHandleDelete, calendarEventUpdateTeamsMeeting } from '@/utils/calendarEvent';
import { deleteEventFromFirestore, removeEmailNotification } from '@/firestore/firestoreOperations';
import { getTeamsMeetingOccurrenceId, updateTeamsMeetingOccurrence, updateTeamsMeeting } from '@/utils/msTeams';
jest.mock('@/firestore/firestoreOperations', () => ({ deleteEventFromFirestore: jest.fn(), removeEmailNotification: jest.fn() }));
jest.mock('@/utils/msTeams', () => ({ getTeamsMeetingOccurrenceId: jest.fn(), updateTeamsMeetingOccurrence: jest.fn(), updateTeamsMeeting: jest.fn() }));
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
