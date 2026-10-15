import { CalendarEntityType, CalendarFlow, studentCalendarStrategy } from '@/lib/patterns/calendarStrategy';

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
