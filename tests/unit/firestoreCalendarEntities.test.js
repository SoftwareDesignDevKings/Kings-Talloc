import { firestoreFetchStudentRequests, firestoreFetchOneOffShifts } from '@/firestore/firestoreFetch';
import { calendarEventGetType } from '@/utils/calendarEvent';
import { onSnapshot } from 'firebase/firestore';
jest.mock('@/firestore/firestoreClient', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({ collection: jest.fn(), doc: jest.fn(), getDoc: jest.fn(), getDocs: jest.fn(), query: jest.fn(), where: jest.fn(), onSnapshot: jest.fn(), Timestamp: { fromDate: date => date } }));
const start = new Date('2027-04-06T05:00Z'), end = new Date('2027-04-06T06:00Z');
const source = data => ({ id: 'a', data: () => ({ ...data, start: { toDate: () => start }, end: { toDate: () => end } }) });
beforeEach(() => jest.clearAllMocks());
test.each(['pending', 'denied'])('loaded %s requests retain their identity for calendar rejection and deletion', approvalStatus => {
    const update = jest.fn();
    onSnapshot.mockImplementation((_query, receive) => { receive({ docs: [source({ approvalStatus, createdByStudent: true })] }); return jest.fn(); });
    firestoreFetchStudentRequests(update, { start, end }, []);
    const event = update.mock.calls[0][0][0];
    expect(event.isStudentRequest).toBe(true);
    expect(calendarEventGetType(event).collectionName).toBe('studentEventRequests');
});
test('an approved shift cannot inherit a stale request marker', () => {
    const update = jest.fn();
    onSnapshot.mockImplementation((_query, receive) => { receive({ docs: [source({ approvalStatus: 'approved', createdByStudent: true, isStudentRequest: true })] }); return jest.fn(); });
    firestoreFetchOneOffShifts(update, { start, end }, []);
    const event = update.mock.calls[0][0][0];
    expect(event.isStudentRequest).toBe(false);
    expect(calendarEventGetType(event).collectionName).toBe('shifts');
});
