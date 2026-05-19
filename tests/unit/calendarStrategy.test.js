import { CalendarEntityType, CalendarFlow, studentCalendarStrategy } from '@/lib/patterns/calendarStrategy';

describe('studentCalendarStrategy', () => {
    const strategy = studentCalendarStrategy('student@example.edu');

    test('students can edit pending requests', () => {
        const request = {
            entityType: CalendarEntityType.STUDENT_REQUEST,
            approvalStatus: 'pending',
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
