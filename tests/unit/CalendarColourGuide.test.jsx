import { render, screen } from '@testing-library/react';
import CalendarColourGuide from '@/components/calendar/CalendarColourGuide';
import CalendarLegend from '@/components/calendar/CalendarLegend';
import { getCalendarColourGuide } from '@/utils/calendarColourGuide';
import { CALENDAR_COLOURS, getAvailabilityHeatColor } from '@/constants/calendarColours';
import { calendarUIGetEventStyle, calendarUIGetSlotProps } from '@/utils/calendarUI';

const shifts = ['confirmed', 'coaching', 'completed', 'coachingCompleted', 'notAttended'];
test.each(['admin', 'teacher', 'tutor', 'coach', 'student'])('%s sees exactly the colours its calendar can show', role => {
    const { container } = render(<CalendarColourGuide userRole={role} descriptions />);
    const expected = ['availabilityHeatmap', ...(['tutor', 'coach'].includes(role) ? ['availabilityBlock'] : []),
        'confirmed', 'coaching', ...(['admin', 'teacher', 'student'].includes(role) ? ['pending', 'denied'] : []),
        'completed', 'coachingCompleted', 'notAttended'];
    expect([...container.querySelectorAll('[data-calendar-colour]')].map(el => el.dataset.calendarColour)).toEqual(expected);
    expect(getCalendarColourGuide(role).filter(entry => shifts.includes(entry.key))).toHaveLength(5);
    expect(screen.queryByText('Green event')).not.toBeInTheDocument(); expect(screen.queryByText('Pink')).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/invitation|awaiting your response/i);
    expect(container.querySelector('[data-calendar-colour="declined"]')).toBeNull();
});

test('changing the active role changes the sidebar guide rather than combining assigned roles', () => {
    const { container, rerender } = render(<CalendarLegend userRole="admin" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
    rerender(<CalendarLegend userRole="tutor" />);
    expect(screen.queryByText('Pending')).not.toBeInTheDocument(); expect(screen.getByText('Availability block')).toBeInTheDocument();
    rerender(<CalendarLegend userRole="student" />);
    expect(screen.queryByText('Availability block')).not.toBeInTheDocument(); expect(screen.queryByText('Declined invitation')).not.toBeInTheDocument();
    expect(container.querySelector('[data-calendar-colour-guide]').dataset.calendarColourGuide).toBe('student');
    rerender(<CalendarLegend userRole="unknown" />);
    expect(container.querySelectorAll('[data-calendar-colour]')).toHaveLength(0);
});

test.each([
    ['confirmed', {}], ['coaching', { workType: 'coaching', workStatus: 'notCompleted' }],
    ['pending', { isStudentRequest: true, approvalStatus: 'pending' }], ['denied', { isStudentRequest: true, approvalStatus: 'denied' }],
    ['completed', { workStatus: 'completed' }], ['coachingCompleted', { workType: 'coaching', workStatus: 'completed' }],
    ['notAttended', { workStatus: 'notAttended' }],
    ['availabilityBlock', { tutor: 'tutor@example.edu' }],
])('%s swatch matches the real event renderer including its accent or dotted outline', (key, event) => {
    const { container } = render(<CalendarColourGuide userRole={key === 'availabilityBlock' ? 'tutor' : 'student'} />);
    const swatch = container.querySelector(`[data-calendar-colour="${key}"] [data-calendar-colour-swatch]`);
    const actual = calendarUIGetEventStyle(event, 'student', 'student@example.edu').style;
    expect(swatch).toHaveStyle({ backgroundColor: actual.backgroundColor, border: actual.border, borderLeft: actual.borderLeft });
});

test('availability guide uses the same green as the real heatmap and capacity controls its intensity', () => {
    const start = new Date(2026, 9, 15, 10); const end = new Date(2026, 9, 15, 11);
    const data = [{ tutor: 'one', start, end }, { tutor: 'two', start: end, end: new Date(+end + 3600000) }];
    expect(calendarUIGetSlotProps(start, data, [], new Date(2026, 9, 12), new Date(2026, 9, 19)).style.backgroundColor).toBe('rgba(144, 238, 144, 0.5)');
    expect(CALENDAR_COLOURS.availabilityHeatmap.bg).toBe(getAvailabilityHeatColor(0.55, 1));
    expect(getAvailabilityHeatColor(3, 2)).toBe('rgba(144, 238, 144, 1)');
});
