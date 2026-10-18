import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { CalendarUIContextProvider, useCalendarUI } from '@/contexts/CalendarUIContext';
let mockRole = 'teacher';
const mockAvailability = [{ id: 'coaching', tutor: 'coach@school.test', start: new Date('2026-10-12T22:00:00Z'), end: new Date('2026-10-13T00:00:00Z'), workType: ['coaching'], locationType: 'remote' }];
jest.mock('@/hooks/useAuthSession', () => () => ({ userRole: mockRole, session: { user: { email: 'teacher@school.test' } } }));
jest.mock('@/hooks/useCalendarStrategy', () => () => ({ calendarFilters: {}, calendarScope: {} }));
jest.mock('@/contexts/AppDataContext', () => ({ useAppData: () => ({ calendarShifts: [], calendarStudentRequests: [], calendarAvailabilities: mockAvailability, bookableAvailability: { slots: [] } }) }));
function Probe() {
    const ui = useCalendarUI();
    return <><button onClick={() => ui.actions.setFilterAvailabilityByWorkType([{ value: 'coaching' }])}>Coaching filter</button><output data-testid="availability">{JSON.stringify(ui.filteredAvailabilities)}</output></>;
}
test.each(['teacher', 'admin'])('%s sees Coaching-only availability before and after filtering', role => {
    mockRole = role;
    render(<CalendarUIContextProvider><Probe /></CalendarUIContextProvider>);
    expect(JSON.parse(screen.getByTestId('availability').textContent)).toHaveLength(1);
    fireEvent.click(screen.getByText('Coaching filter'));
    expect(JSON.parse(screen.getByTestId('availability').textContent)).toHaveLength(1);
});
test('restored management Coaching coverage is never added to the student overlay', () => {
    mockRole = 'student';
    render(<CalendarUIContextProvider><Probe /></CalendarUIContextProvider>);
    expect(JSON.parse(screen.getByTestId('availability').textContent)).toEqual([]);
});
