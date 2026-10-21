import { CalendarEntityType, CalendarFlow, studentCalendarStrategy, tutorCalendarStrategy } from '@/lib/patterns/calendarStrategy';

describe('studentCalendarStrategy', () => {
    const strategy = studentCalendarStrategy('student@example.edu');

    test('students can edit pending requests', () => {
        const request = {
            entityType: CalendarEntityType.STUDENT_REQUEST,
            approvalStatus: 'pending', students: [{ value: 'student@example.edu' }],
        };

        expect(strategy.permissions.canEdit(request)).toBe(true);
        expect(strategy.actions.canModifyEvent(request)).toBe(true);
        expect(strategy.actions.getEventFlow(request)).toBe(CalendarFlow.EDIT_STUDENT_REQUEST);
    });

    test('students view denied requests read-only', () => {
        const request = {
            entityType: CalendarEntityType.STUDENT_REQUEST,
            approvalStatus: 'denied',
        };

        expect(strategy.permissions.canEdit(request)).toBe(false);
        expect(strategy.actions.canModifyEvent(request)).toBe(false);
        expect(strategy.actions.canDuplicateEvent(request)).toBe(false);
        expect(strategy.actions.getEventFlow(request)).toBe(CalendarFlow.VIEW_STUDENT_REQUEST);
    });
});

test('a group participant can view but cannot edit, drag, resize or duplicate the requester’s pending booking', () => {
    const strategy = studentCalendarStrategy('peer@example.edu');
    const request = { entityType: CalendarEntityType.STUDENT_REQUEST, approvalStatus: 'pending', requesterEmail: 'student@example.edu', students: [{ value: 'student@example.edu' }, { value: 'peer@example.edu' }] };
    for (const action of ['canEdit', 'canDrag', 'canResize']) expect(strategy.permissions[action](request)).toBe(false);
    expect(strategy.actions.canModifyEvent(request)).toBe(false);
    expect(strategy.actions.canDuplicateEvent(request)).toBe(false);
    expect(strategy.actions.getEventFlow(request)).toBe(CalendarFlow.VIEW_STUDENT_REQUEST);
});


test.each([studentCalendarStrategy, tutorCalendarStrategy])('own calendar queries cover canonical and legacy spellings only', factory => {
    const constraints = factory('StuDent@Example.edu').firestoreConstraints.shifts();
    expect(constraints).toEqual([{ fbField: 'emailsList', fbOperation: 'array-contains-any', fbValue: ['student@example.edu', 'StuDent@Example.edu'] }]);
    expect(factory('student@example.edu').firestoreConstraints.shifts()).toEqual([{ fbField: 'emailsList', fbOperation: 'array-contains', fbValue: 'student@example.edu' }]);
});

test('students never subscribe to raw tutor availability; every staff role still does', () => {
    const { adminCalendarStrategy, teacherCalendarStrategy, coachCalendarStrategy } = require('@/lib/patterns/calendarStrategy');
    // Students are shown bookable slots from the server instead.
    expect(studentCalendarStrategy('student@example.edu').firestoreConstraints.availabilities()).toBeNull();
    for (const factory of [tutorCalendarStrategy, coachCalendarStrategy, teacherCalendarStrategy, adminCalendarStrategy]) {
        expect(factory('staff@example.edu').firestoreConstraints.availabilities()).toEqual(expect.any(Array));
    }
});

test('a skipped collection opens no Firestore listener and clears its data', () => {
    const { onSnapshot } = require('firebase/firestore');
    const { firestoreFetchAvailabilities } = require('@/firestore/firestoreFetch');
    const setAvailabilities = jest.fn();
    onSnapshot.mockClear();
    const unsubscribe = firestoreFetchAvailabilities(setAvailabilities, { start: new Date(), end: new Date() }, null);
    expect(onSnapshot).not.toHaveBeenCalled();
    expect(setAvailabilities).toHaveBeenCalledWith([]);
    expect(() => unsubscribe()).not.toThrow();
});
