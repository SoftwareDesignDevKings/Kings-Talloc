import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import EventForm from '@/components/forms/EventForm';
import { useAppData } from '@/contexts/AppDataContext';
import { createScheduledEventInFirestore, updateEventInFirestore, updateWorkStatusInFirestore, queueEmailNotification } from '@/firestore/firestoreOperations';
import { calendarEventHandleDelete, calendarEventCreateTeamsMeeting, calendarEventHandleTeamsMeetingUpdate } from '@/utils/calendarEvent';
import { detachRecurringInstance } from '@/utils/calendarRecurringEvents';
const mockAlert = jest.fn();
const mockApprove = jest.fn();
const mockReject = jest.fn();
jest.mock('@/contexts/AppDataContext', () => ({ useAppData: jest.fn() }));
jest.mock('@/hooks/useAlert', () => () => ({ addAlert: mockAlert }));
jest.mock('@/hooks/useApprovalHandlers', () => ({ useApprovalHandlers: () => ({ handleApprove: mockApprove, handleReject: mockReject }) }));
jest.mock('@/firestore/firestoreOperations', () => ({ createScheduledEventInFirestore: jest.fn(), updateEventInFirestore: jest.fn(), updateWorkStatusInFirestore: jest.fn(), queueEmailNotification: jest.fn() }));
jest.mock('@/utils/calendarEvent', () => ({ calendarEventHandleDelete: jest.fn(), calendarEventCreateTeamsMeeting: jest.fn(), calendarEventHandleTeamsMeetingUpdate: jest.fn() }));
jest.mock('@/utils/calendarRecurringEvents', () => ({ ...jest.requireActual('@/utils/calendarRecurringEvents'), detachRecurringInstance: jest.fn() }));
jest.mock('@/utils/msTeams', () => ({ getTeamsMeetingOccurrenceId: jest.fn(), updateTeamsMeetingOccurrence: jest.fn() }));
const staff = { value: 'tutor@example.edu', label: 'Tutor', roles: ['tutor'], locationType: 'onsite' };
const coach = { value: 'coach@example.edu', label: 'Coach', roles: ['coach'] };
const original = { id: 'owned', title: 'Test session', description: 'Notes', start: new Date(2026, 9, 15, 9), end: new Date(2026, 9, 15, 10), staff: [staff], classes: [], students: [], workType: 'work', workStatus: 'notCompleted' };
const close = jest.fn();
const Harness = ({ mode = 'create', role = 'admin', draft = original, event = original }) => {
    const [value, setValue] = useState(draft);
    return <EventForm mode={mode} newEvent={value} setNewEvent={setValue} eventToEdit={event} setShowModal={close} userRole={role} userEmail="admin@example.edu" />;
};
const submit = () => fireEvent.submit(screen.getByRole('form', { name: 'Event form' }));
const dateField = name => screen.getByLabelText(`Event ${name} time`);
const setDateTime = (name, value) => {
    const fields = value ? value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/).slice(1) : null;
    const parts = fields ? [['year', fields[0]], ['month', fields[1]], ['day', fields[2]], ['hour', fields[3]], ['minute', fields[4]]] : [['day', ''], ['month', ''], ['year', ''], ['hour', ''], ['minute', '']];
    for (const [part, text] of parts) {
        const segment = within(dateField(name)).getByRole('spinbutton', { name: new RegExp(`^${part}`) });
        fireEvent.focus(segment);
        if (!text) for (let i = 0; i < 5; i++) fireEvent.keyDown(segment, { key: 'Backspace' });
        if (text) fireEvent(segment, new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: String(Number(text)) }));
    }
};
const dateValue = name => document.querySelector(`input[name="${name}"]`);
const section = name => { const button = screen.getByRole('button', { name }); if (button.getAttribute('aria-expanded') === 'false') fireEvent.click(button); };
const choose = (name, value) => {
    const combo = screen.queryByRole('combobox', { name, exact: true });
    if (combo) fireEvent.keyDown(combo, { key: 'ArrowDown', code: 'ArrowDown' });
    else fireEvent.click(screen.getByRole('button', { name: new RegExp(name) }));
    fireEvent.click(screen.getByRole('option', { name: value, exact: true }));
};
beforeEach(() => {
    jest.clearAllMocks();
    useAppData.mockReturnValue({ calendarShifts: [], tutors: [{ email: staff.value, name: staff.label, roles: staff.roles }, { email: coach.value, name: coach.label, roles: coach.roles }], classes: [{ id: 'class', name: 'Math', courseCode: 'MATH' }], students: [{ email: 'student@example.edu', name: 'Student' }], calendarAvailabilities: [], setCalendarShifts: jest.fn(), setCalendarAvailabilities: jest.fn(), setCalendarStudentRequests: jest.fn() });
    createScheduledEventInFirestore.mockResolvedValue({ id: 'created' }); mockReject.mockResolvedValue(true);
    updateEventInFirestore.mockResolvedValue(); updateWorkStatusInFirestore.mockResolvedValue(); queueEmailNotification.mockResolvedValue(); calendarEventHandleDelete.mockResolvedValue(); detachRecurringInstance.mockResolvedValue('detached'); mockApprove.mockResolvedValue(true);
});
test('create keeps fields, participant chips, settings and exact persistence payload', async () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Event title'), { target: { value: 'Changed' } });
    fireEvent.change(screen.getByLabelText('Event description'), { target: { value: 'Changed notes' } });
    section('Participants'); choose('Assign classes to event', 'Math (MATH)'); choose('Assign students to event', 'Student');
    section('Settings & Status');
    choose('Event work type', 'Work'); choose('Event work status', "Student Didn't Attend");
    submit();
    await waitFor(() => expect(createScheduledEventInFirestore).toHaveBeenCalledWith(expect.objectContaining({ title: 'Changed', description: 'Changed notes', start: original.start, end: original.end, staff: [staff], classes: [{ value: 'class', label: 'Math (MATH)' }], students: [{ value: 'student@example.edu', label: 'Student' }], workType: 'work', workStatus: 'notAttended', recurring: null, createTeamsMeeting: false })));
    expect(queueEmailNotification).toHaveBeenCalledWith(expect.objectContaining({ id: 'created' }), 'allocated', 'admin@example.edu');
    expect(close).toHaveBeenCalledWith(false);
});
test.each(['', '2026-10-15T08:00', '2026-10-15T09:00'])('invalid end %s blocks a write', async value => {
    render(<Harness />); setDateTime('end', value); submit();
    await waitFor(() => expect(mockAlert).toHaveBeenCalledWith('error', 'End date must be after the start date.'));
    expect(createScheduledEventInFirestore).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
});
test.each([
    [{ title: '' }, 'Title is required'],
    [{ staff: [] }, 'At least one tutor must be assigned to the event.'],
    [{ workType: 'coaching' }, 'The following staff do not have the coach role: Tutor'],
    [{ recurring: 'weekly', occurenceNum: 3, workStatus: 'completed' }, 'Cannot make completed events recurring.'],
    [{ recurring: 'weekly', occurenceNum: 1 }, 'Recurring events must have at least 2 occurrences.'],
])('validation preserves %j', async (patch, message) => {
    render(<Harness draft={{ ...original, ...patch }} />); submit();
    await waitFor(() => expect(mockAlert).toHaveBeenCalledWith('error', message));
    expect(createScheduledEventInFirestore).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
});
test('a server scheduling conflict keeps the form open without follow-up writes', async () => {
    createScheduledEventInFirestore.mockRejectedValueOnce(new Error('Scheduling conflict'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<Harness />); submit();
    await waitFor(() => expect(mockAlert).toHaveBeenCalledWith('error', 'Failed to submit event: Scheduling conflict'));
    expect(close).not.toHaveBeenCalled(); expect(queueEmailNotification).not.toHaveBeenCalled(); log.mockRestore();
});
test('weekly toggling and raw occurrence typing retain the existing recurrence payload', async () => {
    render(<Harness />); fireEvent.click(screen.getByRole('button', { name: 'Weekly', exact: true }));
    fireEvent.change(screen.getByLabelText('Occurrences *'), { target: { value: '10' } }); fireEvent.blur(screen.getByLabelText('Occurrences *'));
    fireEvent.click(screen.getByRole('button', { name: 'Add online Teams meeting' })); submit();
    await waitFor(() => expect(createScheduledEventInFirestore).toHaveBeenCalledWith(expect.objectContaining({ recurring: 'weekly', occurenceNum: 10, until: null, createTeamsMeeting: true })));
    expect(calendarEventCreateTeamsMeeting).toHaveBeenCalledWith('created', expect.objectContaining({ createTeamsMeeting: true }), expect.anything());
});
test('ordinary edit keeps its id, notification and Teams update path', async () => {
    render(<Harness mode="edit" />); submit();
    await waitFor(() => expect(updateEventInFirestore).toHaveBeenCalledWith('owned', expect.objectContaining({ title: original.title }), 'shifts', 0));
    expect(queueEmailNotification).toHaveBeenCalledWith(expect.objectContaining({ id: 'owned' }), 'moved', 'admin@example.edu', original);
    expect(calendarEventHandleTeamsMeetingUpdate).toHaveBeenCalled();
});
test('editing an instance detaches it through the existing series helper', async () => {
    render(<Harness mode="edit" event={{ ...original, isRecurringInstance: true }} />); submit();
    await waitFor(() => expect(detachRecurringInstance).toHaveBeenCalledWith(expect.objectContaining({ isRecurringInstance: true }), expect.anything()));
    expect(updateEventInFirestore).not.toHaveBeenCalled();
});
test.each(['teacher', 'student'])('%s view is fully read only without save or delete', role => {
    render(<Harness mode="view" role={role} />); expect(screen.getByLabelText('Event title')).toBeDisabled();
    section('Settings & Status');
    const control = screen.queryByRole('combobox', { name: 'Event work status', exact: true });
    if (control) expect(control).toBeDisabled(); else expect(screen.getByRole('button', { name: /Event work status/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save Status' })).not.toBeInTheDocument(); expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
});
test.each(['tutor', 'coach'])('%s view saves only workStatus even with otherwise invalid fields', async role => {
    render(<Harness mode="view" role={role} draft={{ ...original, title: '', end: original.start, recurring: 'weekly' }} />);
    section('Settings & Status'); choose('Event work status', 'Completed'); submit();
    await waitFor(() => expect(updateWorkStatusInFirestore).toHaveBeenCalledWith('owned', 'completed', 0));
    expect(updateEventInFirestore).not.toHaveBeenCalled(); expect(mockAlert).not.toHaveBeenCalled();
});
test('denial uses main shared rejection handler', async () => {
    render(<Harness mode="edit" draft={{ ...original, createdByStudent: true, approvalStatus: 'pending', preference: 'Online' }} event={{ ...original, isStudentRequest: true }} />);
    section(/Session focus/); choose('Student request approval status', 'Deny'); submit();
    await waitFor(() => expect(mockReject).toHaveBeenCalledWith('owned'));
    expect(mockApprove).not.toHaveBeenCalled();
});
test('close makes no write', () => {
    render(<Harness />); fireEvent.click(screen.getByRole('button', { name: 'Close' })); expect(close).toHaveBeenCalledWith(false); expect(createScheduledEventInFirestore).not.toHaveBeenCalled();
});
test('save failure preserves the dialog for retry', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {}); createScheduledEventInFirestore.mockRejectedValueOnce(new Error('fixture failure'));
    render(<Harness />); submit(); await waitFor(() => expect(mockAlert).toHaveBeenCalledWith('error', 'Failed to submit event: fixture failure'));
    expect(close).not.toHaveBeenCalled(); submit(); await waitFor(() => expect(close).toHaveBeenCalled()); log.mockRestore();
});
test('non-recurring delete calls only the selected event deletion helper after confirmation', async () => {
    render(<Harness mode="edit" />); fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }));
    expect(calendarEventHandleDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }));
    await waitFor(() => expect(calendarEventHandleDelete).toHaveBeenCalledWith(original, 'this', expect.anything())); expect(close).toHaveBeenCalledWith(false);
});
test.each([[true, 'all', 'All occurrences'], [false, 'this', 'Only this occurrence']])('recurring delete defaults and cancellation preserve the draft: original=%s', async (isOriginal, option, label) => {
    render(<Harness mode="edit" event={{ ...original, recurring: isOriginal ? 'weekly' : null, isRecurringInstance: !isOriginal }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true })); expect(screen.getByLabelText(label)).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel', exact: true })); expect(calendarEventHandleDelete).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true })); fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }));
    await waitFor(() => expect(calendarEventHandleDelete).toHaveBeenCalledWith(expect.anything(), option, expect.anything()));
});
test('pending edit prevents duplicate saves and disables delete', async () => {
    let resolve; updateEventInFirestore.mockReturnValueOnce(new Promise(r => { resolve = r; })); render(<Harness mode="edit" />); submit();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled()); expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled(); submit(); expect(updateEventInFirestore).toHaveBeenCalledTimes(1); await act(async () => resolve());
});

test('pending recurring deletion locks confirmation, dismissal and repeat writes', async () => {
    let resolve; calendarEventHandleDelete.mockReturnValueOnce(new Promise(r => { resolve = r; }));
    render(<Harness mode="edit" event={{ ...original, isRecurringInstance: true }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }));
    fireEvent.click(screen.getByLabelText('This and all future occurrences'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Deleting…', exact: true })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled(); expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Deleting…', exact: true })); expect(calendarEventHandleDelete).toHaveBeenCalledTimes(1); expect(close).not.toHaveBeenCalled();
    await act(async () => resolve()); expect(calendarEventHandleDelete).toHaveBeenCalledWith(expect.anything(), 'thisAndFuture', expect.anything()); expect(close).toHaveBeenCalledWith(false);
});
test('failed recurring deletion restores the event dialog and draft', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {}); calendarEventHandleDelete.mockRejectedValueOnce(new Error('fixture failure'));
    render(<Harness mode="edit" event={{ ...original, isRecurringInstance: true }} />);
    fireEvent.change(screen.getByLabelText('Event title'), { target: { value: 'Unsaved draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true })); fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }));
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Edit Event' })).toBeInTheDocument());
    expect(screen.getByLabelText('Event title')).toHaveValue('Unsaved draft'); expect(close).not.toHaveBeenCalled(); expect(mockAlert).toHaveBeenCalledWith('error', 'Failed to delete event'); log.mockRestore();
});
test('single-field status failure leaves view open for retry', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {}); updateWorkStatusInFirestore.mockRejectedValueOnce(new Error('fixture failure'));
    render(<Harness mode="view" role="tutor" />); submit();
    await waitFor(() => expect(mockAlert).toHaveBeenCalledWith('error', 'Failed to update work status: fixture failure')); expect(close).not.toHaveBeenCalled();
    submit(); await waitFor(() => expect(close).toHaveBeenCalled()); log.mockRestore();
});

test('start and end edits are independent and persist local calendar dates across midnight', async () => {
    render(<Harness mode="edit" />);
    setDateTime('start', '2026-10-03T23:47');
    expect(dateValue('end')).toHaveValue('2026-10-15T10:00:00');
    setDateTime('end', '2026-10-04T03:13');
    submit();
    await waitFor(() => expect(updateEventInFirestore).toHaveBeenCalledWith('owned', expect.objectContaining({ start: new Date(2026, 9, 3, 23, 47), end: new Date(2026, 9, 4, 3, 13) }), 'shifts', 0));
});
test('cleared start blocks a write rather than retaining a stale date', async () => {
    render(<Harness />); setDateTime('start', ''); submit();
    await waitFor(() => expect(mockAlert).toHaveBeenCalledWith('error', 'End date must be after the start date.'));
    expect(createScheduledEventInFirestore).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
});
test('view and pending saves disable both date-time controls', async () => {
    let resolve; updateEventInFirestore.mockReturnValueOnce(new Promise(r => { resolve = r; }));
    const { unmount } = render(<Harness mode="view" role="teacher" />);
    expect(dateField('start')).toHaveAttribute('aria-disabled', 'true'); expect(dateField('end')).toHaveAttribute('aria-disabled', 'true');
    unmount(); render(<Harness mode="edit" />); submit();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled());
    expect(dateField('start')).toHaveAttribute('aria-disabled', 'true'); expect(dateField('end')).toHaveAttribute('aria-disabled', 'true');
    await act(async () => resolve());
});

test('an incomplete time segment blocks the last complete date from being saved', async () => {
    render(<Harness mode="edit" />);
    const minute = within(dateField('end')).getByRole('spinbutton', { name: /^minute/ });
    fireEvent.focus(minute);
    fireEvent.keyDown(minute, { key: 'Backspace' });
    fireEvent.keyDown(minute, { key: 'Backspace' });
    expect(minute).toHaveAttribute('data-placeholder', 'true');
    fireEvent.change(screen.getByLabelText('Event description'), { target: { value: 'Other draft edit' } });
    expect(minute).toHaveAttribute('data-placeholder', 'true');
    submit();
    await waitFor(() => expect(mockAlert).toHaveBeenCalledWith('error', 'End date must be after the start date.'));
    expect(updateEventInFirestore).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
});
