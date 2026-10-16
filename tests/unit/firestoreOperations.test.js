import { schedulingMutation } from '@/firestore/schedulingClient';
jest.mock('@/firestore/schedulingClient', () => ({ schedulingMutation: jest.fn() }));
import {
    createEventInFirestore,
    stripUndefinedFields,
    updateEventInFirestore,
} from '@/firestore/firestoreOperations';

describe('stripUndefinedFields', () => {
    test('removes undefined values from Firestore payloads without removing nulls', () => {
        const start = new Date('2026-06-11T10:00:00');

        const cleaned = stripUndefinedFields({
            title: 'Availability',
            start,
            originalAvailabilityId: undefined,
            locationType: null,
            staff: [
                { value: 'tutor@example.edu', label: undefined },
                undefined,
            ],
            metadata: {
                keep: true,
                drop: undefined,
            },
        });

        expect(cleaned).not.toHaveProperty('originalAvailabilityId');
        expect(cleaned.locationType).toBeNull();
        expect(cleaned.start).toBe(start);
        expect(cleaned.staff).toEqual([{ value: 'tutor@example.edu' }]);
        expect(cleaned.metadata).toEqual({ keep: true });
    });
});

describe('createEventInFirestore', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        schedulingMutation.mockResolvedValue({ id: 'created-doc-id' });
    });

    test('strips undefined duplicate metadata before creating availability docs', async () => {
        const docId = await createEventInFirestore(
            {
                title: 'Availability',
                tutor: 'tutor@example.edu',
                start: new Date('2026-06-11T10:00:00'),
                end: new Date('2026-06-11T15:00:00'),
                originalAvailabilityId: undefined,
                metadata: {
                    keep: 'yes',
                    drop: undefined,
                },
            },
            'tutorAvailabilities',
        );

        expect(docId).toBe('created-doc-id');

        const payload = schedulingMutation.mock.calls[0][0].data;
        expect(payload).not.toHaveProperty('originalAvailabilityId');
        expect(payload.metadata).toEqual({ keep: 'yes' });
        expect(schedulingMutation.mock.calls[0][0]).toMatchObject({ action: 'create', collectionName: 'tutorAvailabilities' });
    });

    test('new and duplicated requests go through authoritative creation', async () => {
        await createEventInFirestore({ createdAt: { seconds: 1, nanoseconds: 0 } }, 'studentEventRequests');
        expect(schedulingMutation).toHaveBeenCalledWith(expect.objectContaining({ action: 'create', collectionName: 'studentEventRequests' }));
    });

    test('editing a student request preserves its creation timestamp', async () => {
        await updateEventInFirestore('request', { title: 'Edited', createdAt: { seconds: 1, nanoseconds: 0 } }, 'studentEventRequests');
        expect(schedulingMutation).toHaveBeenCalledWith(expect.objectContaining({ action: 'update', id: 'request', collectionName: 'studentEventRequests' }));
    });
});
