import { useRef, useState } from 'react';
import { queueEmailNotification } from '@/firestore/firestoreOperations';
import { approveStudentRequest, resolveStudentRequest } from '@/firestore/studentRequestApprovals';
import { calendarEventCreateTeamsMeeting } from '@/utils/calendarEvent';
import useAlert from '@/hooks/useAlert';
import useAuthSession from '@/hooks/useAuthSession';

export const useApprovalHandlers = (onUpdate) => {
    const { addAlert } = useAlert();
    const { session } = useAuthSession();
    const processing = useRef(new Set());
    const [processingIds, setProcessingIds] = useState(new Set());

    const perform = async (requestId, action, failureMessage) => {
        if (!requestId || processing.current.has(requestId)) return false;
        processing.current.add(requestId);
        setProcessingIds(new Set(processing.current));
        try {
            await action();
            return true;
        } catch (error) {
            addAlert('error', `${failureMessage}: ${error.message}`);
            return false;
        } finally {
            processing.current.delete(requestId);
            setProcessingIds(new Set(processing.current));
        }
    };

    const handleApprove = (request, changes) => perform(request?.id, async () => {
        const { id, eventData } = await approveStudentRequest(request.id, undefined, changes);
        addAlert('success', 'Request approved successfully');
        // Failures after the atomic conversion must never be reported as a failed approval.
        try {
            await queueEmailNotification({ ...eventData, id }, 'allocated', session?.user?.email);
        } catch (error) {
            addAlert('warning', `Request approved, but the allocation notification could not be queued: ${error.message}`);
        }
        try {
            await calendarEventCreateTeamsMeeting(id, eventData, {
                addAlert: (type, message) => addAlert(type === 'error' ? 'warning' : type,
                    type === 'error' ? `Request approved, but ${message}` : message),
            });
        } catch (error) {
            addAlert('warning', `Request approved, but the Teams meeting could not be created: ${error.message}`);
        }
        try {
            onUpdate?.();
        } catch (error) {
            addAlert('warning', `Request approved, but the dashboard could not be refreshed: ${error.message}`);
        }
    }, 'Failed to approve request');

    const handleReject = requestId => perform(requestId, async () => {
        await resolveStudentRequest(requestId, 'deny');
        onUpdate?.();
    }, 'Failed to reject request');

    const handleDelete = requestId => perform(requestId, async () => {
        await resolveStudentRequest(requestId, 'delete');
        onUpdate?.();
    }, 'Failed to delete request');

    return { handleApprove, handleReject, handleDelete, processingIds };
};
