import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firestore/firestoreClient.js';
import {
    createEventInFirestore,
    deleteEventFromFirestore,
    queueEmailNotification,
} from '@/firestore/firestoreOperations';
import { calendarEventCreateTeamsMeeting } from '@/utils/calendarEvent';
import useAlert from '@/hooks/useAlert';
import useAuthSession from '@/hooks/useAuthSession';

export const useApprovalHandlers = (onUpdate) => {
    const { addAlert } = useAlert();
    const { session } = useAuthSession();
    const userEmail = session?.user?.email;

    const handleApprove = async (request) => {
        try {
            if (!request) {
                console.error('[useApprovalHandlers] Request not found');
                addAlert('error', 'Request not found');
                return;
            }

            // Create event data for the main events collection
            const eventData = {
                title: request.title || 'Tutoring',
                start: request.start,
                end: request.end,
                description: request.description || '',
                students: request.students || [],
                staff: request.staff || [],
                subject: request.subject,
                preference: request.preference,
                createdByStudent: true,
                approvalStatus: 'approved',
                approvedAt: new Date(),
                workStatus: 'notCompleted',
                workType: 'tutoring',
                createTeamsMeeting: true,
            };

            // Delete from studentEventRequests and create in events collection
            await deleteEventFromFirestore(request.id, 'studentEventRequests');

            const docId = await createEventInFirestore(eventData);

            // Queue email notification
            await queueEmailNotification({ ...eventData, id: docId }, 'allocated', userEmail);

            // Create Teams meeting in background
            calendarEventCreateTeamsMeeting(docId, eventData, {
                addAlert,
            }).catch((error) => {
                console.error('[useApprovalHandlers] Teams meeting creation failed:', error);
                addAlert('error', `Event approved but Teams meeting failed: ${error.message}`);
            });

            addAlert('success', 'Request approved successfully. Teams meeting is being created...');

            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('[useApprovalHandlers] Error approving request:', error);
            addAlert('error', `Failed to approve request: ${error.message}`);
        }
    };

    const handleReject = async (requestId) => {
        try {
            const requestRef = doc(db, 'studentEventRequests', requestId);
            await updateDoc(requestRef, {
                approvalStatus: 'rejected',
                rejectedAt: new Date(),
            });
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('[useApprovalHandlers] Error rejecting request:', error);
            addAlert('error', 'Failed to reject request');
        }
    };

    const handleDelete = async (requestId) => {
        try {
            const requestRef = doc(db, 'studentEventRequests', requestId);
            await deleteDoc(requestRef);
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('[useApprovalHandlers] Error deleting request:', error);
            addAlert('error', 'Failed to delete request');
        }
    };

    return {
        handleApprove,
        handleReject,
        handleDelete,
    };
};
