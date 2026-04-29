import { calendarEventGetType } from '../../../src/utils/calendarEvent';

// Mock dependencies that fail to load in the test environment
jest.mock('@/firestore/firestoreOperations', () => ({}));
jest.mock('@/utils/msTeams', () => ({}));

describe('calendarEventGetType', () => {
    it('should return isAvailability: true and tutorAvailabilities collection for a tutor event', () => {
        const event = { tutor: 'tutor@example.com' };
        const result = calendarEventGetType(event);
        expect(result).toEqual({
            isAvailability: true,
            isStudentRequest: false,
            collectionName: 'tutorAvailabilities',
        });
    });

    it('should return isStudentRequest: true and studentEventRequests collection for a student request', () => {
        const event = { isStudentRequest: true };
        const result = calendarEventGetType(event);
        expect(result).toEqual({
            isAvailability: false,
            isStudentRequest: true,
            collectionName: 'studentEventRequests',
        });
    });

    it('should return shifts collection for a regular event', () => {
        const event = {};
        const result = calendarEventGetType(event);
        expect(result).toEqual({
            isAvailability: false,
            isStudentRequest: false,
            collectionName: 'shifts',
        });
    });

    it('should prioritize isAvailability over isStudentRequest', () => {
        const event = { tutor: 'tutor@example.com', isStudentRequest: true };
        const result = calendarEventGetType(event);
        expect(result).toEqual({
            isAvailability: true,
            isStudentRequest: true,
            collectionName: 'tutorAvailabilities',
        });
    });
});
