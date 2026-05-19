import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CustomEvent, { getEventParticipantInitials } from '@/components/calendar/CustomEvent.jsx';

describe('CustomEvent', () => {
    test('adds same-day initials to the event hover title', () => {
        render(
            <CustomEvent
                event={{
                    title: 'Tutoring',
                    entityType: 'shifts',
                    start: new Date('2026-05-04T10:00:00'),
                    end: new Date('2026-05-04T11:30:00'),
                    staff: [{ value: 'jane.teacher@example.edu', label: 'Jane Teacher' }],
                }}
                tutors={[]}
                dayInitials="AB, JT"
            />,
        );

        expect(screen.getByText('Tutoring').closest('.rbc-event-content')).toHaveAttribute(
            'title',
            'Tutoring\n10:00 AM - 11:30 AM\nOn this day: AB, JT',
        );
    });

    test('derives participant initials from shift staff', () => {
        expect(getEventParticipantInitials({
            entityType: 'shifts',
            staff: [
                { value: 'jane.teacher@example.edu', label: 'Jane Teacher' },
                { value: 'lee@example.edu', label: 'Lee' },
            ],
        }, [])).toEqual(['JT', 'LE']);
    });
});
