import { calendarUIGetEventStyle } from '@/utils/calendarUI';
import { CALENDAR_COLOURS } from '@/constants/calendarColours';

describe('calendarUIGetEventStyle', () => {
    test('styles tutor availability event blocks as neutral dashed planning items', () => {
        const result = calendarUIGetEventStyle({
            entityType: 'tutorAvailabilities',
            tutor: 'tutor@example.edu',
        });

        expect(result.style).toMatchObject({
            backgroundColor: CALENDAR_COLOURS.availabilityBlock.bg,
            borderColor: CALENDAR_COLOURS.availabilityBlock.border,
            border: `2px ${CALENDAR_COLOURS.availabilityBlock.borderStyle} ${CALENDAR_COLOURS.availabilityBlock.border}`,
            borderStyle: CALENDAR_COLOURS.availabilityBlock.borderStyle,
            borderWidth: '2px',
            color: CALENDAR_COLOURS.availabilityBlock.text,
        });
    });

    test('keeps completed shifts green', () => {
        const result = calendarUIGetEventStyle({
            entityType: 'shifts',
            workStatus: 'completed',
        });

        expect(result.style).toMatchObject({
            backgroundColor: CALENDAR_COLOURS.completed.bg,
            borderColor: CALENDAR_COLOURS.completed.border,
            border: `2px solid ${CALENDAR_COLOURS.completed.border}`,
            borderStyle: 'solid',
            borderWidth: '2px',
        });
    });

    test('styles not completed coaching distinctly from tutoring', () => {
        const result = calendarUIGetEventStyle({
            entityType: 'shifts',
            workType: 'coaching',
            workStatus: 'notCompleted',
        });

        expect(result.style).toMatchObject({
            backgroundColor: CALENDAR_COLOURS.coaching.bg,
            borderColor: CALENDAR_COLOURS.coaching.border,
            border: `2px solid ${CALENDAR_COLOURS.coaching.border}`,
            borderStyle: 'solid',
            borderWidth: '2px',
            color: CALENDAR_COLOURS.coaching.text,
        });
    });

    test('treats approved student-created sessions as normal confirmed sessions', () => {
        const result = calendarUIGetEventStyle({
            entityType: 'shifts',
            createdByStudent: true,
            approvalStatus: 'approved',
            workStatus: 'notCompleted',
            workType: 'tutoring',
        });

        expect(result.style).toMatchObject({
            backgroundColor: CALENDAR_COLOURS.confirmed.bg,
            borderColor: CALENDAR_COLOURS.confirmed.border,
            border: `2px solid ${CALENDAR_COLOURS.confirmed.border}`,
            color: CALENDAR_COLOURS.confirmed.text,
        });
    });

    test('keeps student request states distinct', () => {
        expect(calendarUIGetEventStyle({
            isStudentRequest: true,
            approvalStatus: 'pending',
        }).style).toMatchObject({
            backgroundColor: CALENDAR_COLOURS.pending.bg,
            borderColor: CALENDAR_COLOURS.pending.border,
            border: `2px solid ${CALENDAR_COLOURS.pending.border}`,
        });

        expect(calendarUIGetEventStyle({
            isStudentRequest: true,
            approvalStatus: 'denied',
        }).style).toMatchObject({
            backgroundColor: CALENDAR_COLOURS.denied.bg,
            borderColor: CALENDAR_COLOURS.denied.border,
            border: `2px solid ${CALENDAR_COLOURS.denied.border}`,
        });
    });
});
