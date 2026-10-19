import React from 'react';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import CalendarToolbar from '@/components/calendar/CalendarToolbar';
import { calendarUIMessages } from '@/utils/calendarUI';
import CalendarFilterPanel from '@/components/calendar/CalendarFilterPanel';
import CalendarHowToModal from '@/components/modals/CalendarHowToModal';
import { CalendarUIContextProvider, useCalendarUI } from '@/contexts/CalendarUIContext';
import { useAppData } from '@/contexts/AppDataContext';
import useAuthSession from '@/hooks/useAuthSession';
import { getDoc, updateDoc } from 'firebase/firestore';

jest.mock('@/hooks/useAuthSession');
jest.mock('@/contexts/AppDataContext', () => ({ useAppData: jest.fn() }));

const email = 'viewer@example.edu';
const tutor = { email, name: 'Eligible Tutor' };
const other = { email: 'other@example.edu', name: 'Other Tutor' };
const at = hour => new Date(2026, 9, 15, hour);
const shift = (id, workType, staffEmail = email) => ({ id, entityType: 'shifts', workType, staff: [{ value: staffEmail }], start: at(9), end: at(10) });
let data;
const Probe = () => {
    const { filteredEvents, filteredAvailabilities } = useCalendarUI();
    return <><output aria-label="Visible events">{filteredEvents.map(e => e.id).join(',')}</output><output aria-label="Visible availability">{filteredAvailabilities.map(e => e.tutor).join(',')}</output></>;
};
const tree = <CalendarUIContextProvider><CalendarFilterPanel /><Probe /></CalendarUIContextProvider>;
const mount = (role = 'admin') => {
    useAuthSession.mockReturnValue({ userRole: role, session: { user: { email } } });
    return render(tree);
};
const selectOption = (index, text) => {
    fireEvent.keyDown(screen.getAllByRole('button', { name: /^(Select tutors|Select tutors to view availabilities|Filter availabilities)$/ })[index], { key: 'ArrowDown', code: 'ArrowDown' });
    fireEvent.click(screen.getByRole('option', { name: text, exact: true }));
};
beforeEach(() => {
    jest.clearAllMocks();
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ hasSeenCalendarHelp: true }) });
    updateDoc.mockResolvedValue();
    data = {
        tutors: [tutor, other], studentTutorEligibility: { eligibleTutorEmails: [email] },
        calendarShifts: [shift('Tutoring fixture', 'tutoring'), shift('Coaching fixture', 'coaching'), shift('Work fixture', 'work', other.email)],
        calendarStudentRequests: [{ id: 'Denied fixture', entityType: 'studentEventRequests', approvalStatus: 'denied' }],
        calendarAvailabilities: [
            { id: 'own', tutor: email, workType: ['tutoring'], start: at(12), end: at(13) },
            { id: 'other', tutor: other.email, workType: 'coaching', start: at(12), end: at(13) },
        ],
    };
    useAppData.mockImplementation(() => data);
});

test.each(['admin', 'teacher', 'tutor', 'coach', 'student'])('%s retains role-specific filters and legend', role => {
    mount(role);
    expect(screen.getAllByRole('button', { name: /^(Select tutors|Select tutors to view availabilities|Filter availabilities)$/ })).toHaveLength(1);
    expect(screen.queryByLabelText('Hide denied student requests') !== null).toBe(['admin', 'teacher'].includes(role));
    expect(screen.queryByLabelText('Hide my own availabilities') !== null).toBe(['tutor', 'coach'].includes(role));
    expect(screen.queryByTitle('How to use the calendar') !== null).toBe(role === 'student');
    expect(screen.getByText('Calendar Legend')).toBeInTheDocument();
    expect(screen.queryByText('Availability block') !== null).toBe(['tutor', 'coach'].includes(role));
    expect(screen.queryByText('Pending', { exact: true }) !== null).toBe(!['tutor', 'coach'].includes(role));
});
test('shift switches remove only their corresponding work types and restore them', () => {
    mount();
    for (const [label, id] of [['Show coaching shifts', 'Coaching fixture'], ['Show work shifts', 'Work fixture']]) {
        fireEvent.click(screen.getByLabelText(label));
        expect(screen.getByLabelText('Visible events')).not.toHaveTextContent(id);
        fireEvent.click(screen.getByLabelText(label));
        expect(screen.getByLabelText('Visible events')).toHaveTextContent(id);
    }
});
test('denied switch keeps other events and restores requests', () => {
    mount('teacher');
    fireEvent.click(screen.getByLabelText('Hide denied student requests'));
    expect(screen.getByLabelText('Visible events')).not.toHaveTextContent('Denied fixture');
    expect(screen.getByLabelText('Visible events')).toHaveTextContent('Tutoring fixture');
    fireEvent.click(screen.getByLabelText('Hide denied student requests'));
    expect(screen.getByLabelText('Visible events')).toHaveTextContent('Denied fixture');
});
test('availability master disables Hide mine without losing its state', () => {
    mount('tutor');
    fireEvent.click(screen.getByLabelText('Hide my own availabilities'));
    expect(screen.getByLabelText('Visible availability')).not.toHaveTextContent(email);
    expect(screen.getByLabelText('Visible availability')).toHaveTextContent(other.email);
    fireEvent.click(screen.getByLabelText('Show tutor availabilities'));
    expect(screen.getByLabelText('Hide my own availabilities')).toBeDisabled();
    expect(screen.getByLabelText('Visible availability')).toBeEmptyDOMElement();
    fireEvent.click(screen.getByLabelText('Show tutor availabilities'));
    expect(screen.getByLabelText('Hide my own availabilities')).toBeChecked();
    fireEvent.click(screen.getByLabelText('Hide my own availabilities'));
    expect(screen.getByLabelText('Visible availability')).toHaveTextContent(email);
});
test('multi tutor selection filters events and availability, clearing restores both', () => {
    mount();
    selectOption(0, 'Other Tutor');
    expect(screen.getByLabelText('Visible events')).not.toHaveTextContent('Tutoring fixture');
    expect(screen.getByLabelText('Visible events')).toHaveTextContent('Work fixture');
    selectOption(0, 'Eligible Tutor');
    expect(screen.getByLabelText('Visible events')).toHaveTextContent('Tutoring fixture');
    fireEvent.keyDown(screen.getAllByRole('button', { name: /^(Select tutors|Select tutors to view availabilities|Filter availabilities)$/ })[0], { key: 'Backspace', code: 'Backspace' });
    fireEvent.keyDown(screen.getAllByRole('button', { name: /^(Select tutors|Select tutors to view availabilities|Filter availabilities)$/ })[0], { key: 'Backspace', code: 'Backspace' });
    expect(screen.getByLabelText('Visible availability')).toHaveTextContent(email);
    expect(screen.getByLabelText('Visible availability')).toHaveTextContent(other.email);
});
test('main availability has no legacy work-type dropdown', () => {
    mount();
    expect(screen.queryByRole('button', { name: 'Filter availabilities' })).not.toBeInTheDocument();
});
test('students see only eligible tutor options and stale selections are pruned', async () => {
    const view = mount('student');
    selectOption(0, 'Eligible Tutor');
    expect(screen.queryByRole('option', { name: 'Other Tutor' })).not.toBeInTheDocument();
    data = { ...data, studentTutorEligibility: { eligibleTutorEmails: [] } };
    view.rerender(<CalendarUIContextProvider><CalendarFilterPanel /><Probe /></CalendarUIContextProvider>);
    await waitFor(() => expect(view.container.querySelector('[data-untitled-multi-select] button[disabled]')).toBeInTheDocument());
    expect(screen.getByLabelText('Visible availability')).toBeEmptyDOMElement();
    expect(screen.queryByText('Eligible Tutor', { exact: true })).not.toBeInTheDocument();
});
test('student help auto-shows on first visit and closing persists only the seen flag', async () => {
    useAuthSession.mockReturnValue({ userRole: 'student', session: { user: { email } } });
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ hasSeenCalendarHelp: false }) });
    const hide = jest.fn();
    render(<CalendarHowToModal show={false} onHide={hide} autoShow />);
    const dialog = await screen.findByRole('dialog', { name: 'How to Use the Calendar' });
    expect(within(dialog).getByText('Working with Events')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Got it!' }));
    await waitFor(() => expect(updateDoc).toHaveBeenCalledWith(undefined, { hasSeenCalendarHelp: true }));
    expect(hide).toHaveBeenCalledTimes(1);
});


test('toolbar forwards RBC navigation tokens and available views without doing date arithmetic', () => {
    const onNavigate = jest.fn();
    const onView = jest.fn();
    render(<CalendarToolbar label="October 12 – 18" localizer={{ messages: calendarUIMessages }} onNavigate={onNavigate} onView={onView} views={['day', 'week']} view="week" />);
    for (const label of ['Today', 'Back', 'Next']) fireEvent.click(screen.getByRole('button', { name: label, exact: true }));
    expect(onNavigate.mock.calls).toEqual([['TODAY'], ['PREV'], ['NEXT']]);
    expect(screen.getByRole('button', { name: 'Week', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Day', exact: true })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: 'Month', exact: true })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Day', exact: true }));
    expect(onView).toHaveBeenCalledWith('day');
});
