import { act, renderHook } from '@testing-library/react';
import { useApprovalHandlers } from '@/hooks/useApprovalHandlers';
import { approveStudentRequest, resolveStudentRequest } from '@/firestore/studentRequestApprovals';
import { queueEmailNotification } from '@/firestore/firestoreOperations';
import { calendarEventCreateTeamsMeeting } from '@/utils/calendarEvent';

const mockAddAlert = jest.fn();
jest.mock('@/hooks/useAlert', () => () => ({ addAlert: mockAddAlert }));
jest.mock('@/hooks/useAuthSession', () => () => ({ session: { user: { email: 'mienna@kings.edu.au' } } }));
jest.mock('@/firestore/studentRequestApprovals', () => ({ approveStudentRequest: jest.fn(), resolveStudentRequest: jest.fn() }));
jest.mock('@/firestore/firestoreOperations', () => ({ queueEmailNotification: jest.fn() }));
jest.mock('@/utils/calendarEvent', () => ({ calendarEventCreateTeamsMeeting: jest.fn() }));

describe('approval handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(window, 'confirm').mockReturnValue(true);
        resolveStudentRequest.mockResolvedValue({});
        approveStudentRequest.mockResolvedValue({ id: 'shift', eventData: { title: 'Tutoring' } });
        queueEmailNotification.mockResolvedValue();
        calendarEventCreateTeamsMeeting.mockResolvedValue();
    });

    test('double clicks only approve once and all actions for the row are locked while processing', async () => {
        let finish;
        approveStudentRequest.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
        const { result } = renderHook(() => useApprovalHandlers());
        let operation;
        act(() => { operation = result.current.handleApprove({ id: 'request' }); });
        expect(result.current.processingIds.has('request')).toBe(true);
        await act(async () => {
            expect(await result.current.handleApprove({ id: 'request' })).toBe(false);
            expect(await result.current.handleReject('request')).toBe(false);
            finish({ id: 'shift', eventData: {} });
            await operation;
        });
        expect(approveStudentRequest).toHaveBeenCalledTimes(1);
        expect(result.current.processingIds.size).toBe(0);
    });

    test('failed approval does not send follow-ups and unlocks the row', async () => {
        approveStudentRequest.mockRejectedValue(new Error('Write failed'));
        const { result } = renderHook(() => useApprovalHandlers());
        await act(async () => { expect(await result.current.handleApprove({ id: 'request' })).toBe(false); });
        expect(queueEmailNotification).not.toHaveBeenCalled();
        expect(calendarEventCreateTeamsMeeting).not.toHaveBeenCalled();
        expect(mockAddAlert).toHaveBeenCalledWith('error', 'Failed to approve request: Write failed');
        expect(result.current.processingIds.size).toBe(0);
    });

    test('follow-up failures retain successful approval and attempt both follow-ups', async () => {
        queueEmailNotification.mockRejectedValue(new Error('Queue unavailable'));
        calendarEventCreateTeamsMeeting.mockImplementation(async (_id, _event, { addAlert }) => addAlert('error', 'Failed to create Teams meeting'));
        const { result } = renderHook(() => useApprovalHandlers());
        await act(async () => { expect(await result.current.handleApprove({ id: 'request' })).toBe(true); });
        expect(calendarEventCreateTeamsMeeting).toHaveBeenCalled();
        expect(mockAddAlert).toHaveBeenCalledWith('success', 'Request approved successfully');
        expect(mockAddAlert.mock.calls.filter(([type]) => type === 'warning')).toHaveLength(2);
        expect(mockAddAlert.mock.calls.some(([type]) => type === 'error')).toBe(false);
    });

    test('a refresh callback failure cannot misreport a committed approval', async () => {
        const { result } = renderHook(() => useApprovalHandlers(() => { throw new Error('Refresh failed'); }));
        await act(async () => { expect(await result.current.handleApprove({ id: 'request' })).toBe(true); });
        expect(mockAddAlert).toHaveBeenCalledWith('success', 'Request approved successfully');
        expect(mockAddAlert.mock.calls.some(([type]) => type === 'error')).toBe(false);
    });

test.each(['handleReject', 'handleDelete'])('%s cancellation performs no write and does not refresh', async handler => {
    window.confirm.mockReturnValue(false);
    const refresh = jest.fn();
    const { result } = renderHook(() => useApprovalHandlers(refresh));
    await act(async () => { expect(await result.current[handler]('request')).toBe(false); });
    expect(resolveStudentRequest).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(result.current.processingIds.size).toBe(0);
});
test.each([['handleReject', 'deny'], ['handleDelete', 'delete']])('%s confirms the distinct server action %s', async (handler, action) => {
    window.confirm.mockReturnValue(true);
    const { result } = renderHook(() => useApprovalHandlers());
    await act(async () => { expect(await result.current[handler]('request')).toBe(true); });
    expect(resolveStudentRequest).toHaveBeenCalledWith('request', action);
    if (action === 'delete') expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Students will no longer be able to see that it was rejected'));
});

});
