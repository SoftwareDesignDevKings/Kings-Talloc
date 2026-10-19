import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import TutorAvailabilityForm from '@/components/forms/TutorAvailabilityForm';
import { useAppData } from '@/contexts/AppDataContext';
import { createEventInFirestore, updateEventInFirestore, deleteEventFromFirestore } from '@/firestore/firestoreOperations';

const mockAlert = jest.fn();
jest.mock('@/contexts/AppDataContext', () => ({ useAppData: jest.fn() }));
jest.mock('@/hooks/useAlert', () => () => ({ addAlert: mockAlert }));
jest.mock('@/firestore/firestoreOperations', () => ({ createEventInFirestore: jest.fn(), updateEventInFirestore: jest.fn(), deleteEventFromFirestore: jest.fn() }));
const start = new Date(2026, 9, 15, 9);
const end = new Date(2026, 9, 15, 10);
const original = { id: 'owned', title: 'Availability', start, end, tutor: 'tutor@example.edu', workType: 'work', locationType: 'onsite' };
const other = { ...original, id: 'untouched', tutor: 'other@example.edu' };
const setAvailabilities = jest.fn();
const close = jest.fn();
const Harness = ({ mode = 'create', role = 'tutor', roles = [], draft = original, event = original }) => {
    const [value, setValue] = useState(draft);
    return <TutorAvailabilityForm mode={mode} newAvailability={value} setNewAvailability={setValue} eventToEdit={event} setShowModal={close} userRole={role} userRoles={roles} />;
};
const submit = () => fireEvent.submit(screen.getByRole('form', { name: 'Availability form' }));
const setDateTime = (name, value) => {
    const field = screen.getByLabelText(`Availability ${name} time`);
    if (field.tagName === 'INPUT') return fireEvent.change(field, { target: { value } });
    const parts = value ? value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/).slice(1) : ['', '', '', '', ''];
    ['year', 'month', 'day', 'hour', 'minute'].forEach((part, index) => {
        const segment = within(field).getByRole('spinbutton', { name: new RegExp(`^${part}`) });
        fireEvent.focus(segment);
        if (!parts[index]) for (let i = 0; i < 5; i++) fireEvent.keyDown(segment, { key: 'Backspace' });
        else fireEvent(segment, new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: String(Number(parts[index])) }));
    });
};
const expectDateDisabled = name => {
    const field = screen.getByLabelText(`Availability ${name} time`);
    if (field.tagName === 'INPUT') expect(field).toBeDisabled();
    else expect(field).toHaveAttribute('aria-disabled', 'true');
};
const choose = (name, option) => {
    const combobox = screen.queryByRole('combobox', { name, exact: true });
    if (combobox) fireEvent.keyDown(combobox, { key: 'ArrowDown', code: 'ArrowDown' });
    else fireEvent.click(screen.queryByRole('button', { name, exact: true }) || screen.getByRole('button', { name: new RegExp(name) }));
    fireEvent.click(screen.getByRole('option', { name: option, exact: true }));
};
beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    useAppData.mockReturnValue({ calendarAvailabilities: [original, other], setCalendarAvailabilities: setAvailabilities });
    createEventInFirestore.mockResolvedValue('created');
    updateEventInFirestore.mockResolvedValue();
    deleteEventFromFirestore.mockResolvedValue();
});

test.each([['tutor', ['work']], ['coach', ['coaching']]])('%s availability keeps main category without a type selector', async (role, expected) => {
    render(<Harness role={role} />);
    expect(screen.queryByLabelText('Work type')).not.toBeInTheDocument();
    choose('Location type', 'Remote'); submit();
    await waitFor(() => expect(createEventInFirestore).toHaveBeenCalledWith(expect.objectContaining({ title: 'Availability', start, end, tutor: original.tutor, workType: expected, locationType: 'remote' }), 'tutorAvailabilities'));
    expect(setAvailabilities).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledWith(false);
});
test('edit changes only the selected record and normalises a legacy work-type string', async () => {
    render(<Harness mode="edit" />);
    setDateTime('end', '2026-10-15T11:30');
    submit();
    await waitFor(() => expect(updateEventInFirestore).toHaveBeenCalledWith('owned', expect.objectContaining({ end: new Date(2026, 9, 15, 11, 30), workType: ['work'] }), 'tutorAvailabilities', 0));
    expect(createEventInFirestore).not.toHaveBeenCalled();
    expect(setAvailabilities).not.toHaveBeenCalled();
});
test.each(['2026-10-15T08:00', '2026-10-15T09:00', ''])('invalid end %s prevents persistence and keeps the draft open', async value => {
    render(<Harness />);
    setDateTime('end', value);
    submit();
    await waitFor(() => expect(mockAlert).toHaveBeenCalledWith('error', 'End date must be after the start date.'));
    expect(createEventInFirestore).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
});
test('view mode has disabled fields and no save/delete controls', () => {
    render(<Harness mode="view" />);
    expect(screen.getByRole('dialog', { name: 'Availability Details' })).toBeInTheDocument();
    expectDateDisabled('start');
    expectDateDisabled('end');
    expect(screen.queryByRole('form', { name: 'Availability form' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument();
});
test('close discards edits without any write', () => {
    render(<Harness mode="edit" />);
    setDateTime('end', '2026-10-15T13:00');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(close).toHaveBeenCalledWith(false);
    expect(updateEventInFirestore).not.toHaveBeenCalled();
});
test('save failure keeps the modal and draft, and supports retry', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    createEventInFirestore.mockRejectedValueOnce(new Error('fixture failure'));
    render(<Harness />);
    submit();
    await waitFor(() => expect(mockAlert).toHaveBeenCalledWith('error', 'Failed to submit availability: fixture failure'));
    expect(close).not.toHaveBeenCalled();
    expect(setAvailabilities).not.toHaveBeenCalled();
    submit();
    await waitFor(() => expect(close).toHaveBeenCalledWith(false));
    console.error.mockRestore();
});
test('pending save disables the submit and delete actions and prevents duplicate submissions', async () => {
    let resolve;
    updateEventInFirestore.mockReturnValueOnce(new Promise(r => { resolve = r; }));
    render(<Harness mode="edit" />);
    submit();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    submit();
    expect(updateEventInFirestore).toHaveBeenCalledTimes(1);
    await act(async () => { resolve(); });
});
test('deleting a rendered availability fragment removes its original document only', async () => {
    render(<Harness mode="edit" event={{ ...original, id: 'fragment', originalAvailabilityId: 'owned' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteEventFromFirestore).toHaveBeenCalledWith('owned', 'tutorAvailabilities'));
    expect(setAvailabilities).toHaveBeenCalledWith([other]);
    expect(close).toHaveBeenCalledWith(false);
});
test('delete failure keeps the dialog and availability intact', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    deleteEventFromFirestore.mockRejectedValueOnce(new Error('fixture failure'));
    render(<Harness mode="edit" />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(mockAlert).toHaveBeenCalledWith('error', 'Failed to delete availability'));
    expect(close).not.toHaveBeenCalled();
    expect(setAvailabilities).not.toHaveBeenCalled();
    console.error.mockRestore();
});


test('pending delete disables editing and dismissal and cannot overlap another write', async () => {
    let resolve;
    deleteEventFromFirestore.mockReturnValueOnce(new Promise(r => { resolve = r; }));
    render(<Harness mode="edit" />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    expectDateDisabled('start');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    submit();
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(deleteEventFromFirestore).toHaveBeenCalledTimes(1);
    expect(updateEventInFirestore).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    await act(async () => { resolve(); });
    expect(close).toHaveBeenCalledTimes(1);
});


test('new availability uses main category even when its draft has an empty legacy array', async () => {
    render(<Harness draft={{ ...original, workType: [] }} />);
    submit();
    await waitFor(() => expect(createEventInFirestore).toHaveBeenCalledWith(expect.objectContaining({ workType: ['work'] }), 'tutorAvailabilities'));
});

test.each(['', '2026-10-15T10:00', '2026-10-15T11:00'])('invalid start %s blocks persistence', async value => {
    render(<Harness />); setDateTime('start', value); submit();
    await waitFor(() => expect(mockAlert).toHaveBeenCalledWith('error', 'End date must be after the start date.'));
    expect(createEventInFirestore).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
});
test.each([
    ['2026-10-15T23:47', '2026-10-16T00:13', '2026-10-16T01:37'],
    ['2026-10-04T01:13', '2026-10-04T03:47', '2026-10-04T04:13'],
])('independent boundaries preserve exact local times across midnight or DST: %s', async (from, to, nextEnd) => {
    render(<Harness draft={{ ...original, start: new Date(from), end: new Date(to) }} />);
    setDateTime('end', nextEnd); submit();
    await waitFor(() => expect(createEventInFirestore).toHaveBeenCalledWith(expect.objectContaining({ start: new Date(from), end: new Date(nextEnd), tutor: original.tutor, workType: ['work'], locationType: 'onsite' }), 'tutorAvailabilities'));
});

test.each(['start', 'end'])('partial %s time remains incomplete after a location change and cannot save a stale value', async name => {
    render(<Harness />);
    const minute = within(screen.getByLabelText(`Availability ${name} time`)).getByRole('spinbutton', { name: /^minute/ });
    fireEvent.focus(minute); fireEvent.keyDown(minute, { key: 'Backspace' }); fireEvent.keyDown(minute, { key: 'Backspace' });
    choose('Location type', 'Remote');
    expect(minute).toHaveAttribute('data-placeholder'); submit();
    await waitFor(() => expect(mockAlert).toHaveBeenCalledWith('error', 'End date must be after the start date.'));
    expect(createEventInFirestore).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
});
