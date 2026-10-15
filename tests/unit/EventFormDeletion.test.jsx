import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EventForm from '@/components/forms/EventForm';
import { updateWorkStatusInFirestore } from '@/firestore/firestoreOperations';
import { calendarEventHandleDelete } from '@/utils/calendarEvent';
jest.mock('@/hooks/useApprovalHandlers', () => ({ useApprovalHandlers: () => ({ handleApprove: jest.fn(), handleReject: jest.fn() }) }));
jest.mock('@/hooks/useAlert', () => () => ({ addAlert: jest.fn() }));
jest.mock('@/contexts/AppDataContext', () => ({ useAppData: () => ({ calendarShifts: [], setCalendarShifts: jest.fn(), setCalendarAvailabilities: jest.fn(), setCalendarStudentRequests: jest.fn() }) }));
jest.mock('@/components/forms/useEventFormData', () => ({ useEventFormData: () => ({ staffOptions: [], classOptions: [], studentOptions: [] }) }));
jest.mock('@/firestore/firestoreOperations', () => ({ updateEventInFirestore: jest.fn(), updateWorkStatusInFirestore: jest.fn() }));
jest.mock('@/utils/calendarEvent', () => ({ calendarEventHandleDelete: jest.fn() }));
jest.mock('@/components/forms/EventFormSections/EventDetailsSection', () => () => null);
jest.mock('@/components/forms/EventFormSections/ParticipantsSection', () => () => null);
jest.mock('@/components/forms/EventFormSections/SettingsSection', () => () => null);
jest.mock('@/components/forms/EventFormSections/StudentRequestSection', () => () => null);
jest.mock('@/components/modals/BaseModal', () => function MockModal({ show, title, children, customFooter, deleteButton, onSubmit, submitVariant }) {
    return show ? <div role="dialog" aria-label={title}>{children}{customFooter}{onSubmit && <button className={`btn btn-${submitVariant}`} onClick={() => onSubmit({ preventDefault() {} })}>Save</button>}{deleteButton && <button onClick={deleteButton.onClick}>Delete from editor</button>}</div> : null;
});
beforeEach(() => { jest.clearAllMocks(); calendarEventHandleDelete.mockResolvedValue(); });
test.each([false, true])('single event deletion asks first; student request=%s', async isStudentRequest => {
    const close = jest.fn();
    const event = { id: 'a', title: 'Session', start: new Date(), end: new Date(), isStudentRequest };
    render(<EventForm mode="edit" newEvent={event} eventToEdit={event} setNewEvent={jest.fn()} setShowModal={close} userRole="teacher" />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete from editor' }));
    expect(calendarEventHandleDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(calendarEventHandleDelete).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete from editor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete', exact: true }));
    await waitFor(() => expect(calendarEventHandleDelete).toHaveBeenCalledWith(event, 'this', expect.any(Object)));
    await waitFor(() => expect(close).toHaveBeenCalledWith(false));
});

test.each([false, true])('removing completed hours has a red Save and requires confirmation: %s', async confirmed => {
    jest.spyOn(window, 'confirm').mockReturnValue(confirmed);
    const event = { id: 'paid', workStatus: 'completed' };
    render(<EventForm mode="view" eventToEdit={event} newEvent={{ ...event, workStatus: 'notCompleted' }} setNewEvent={jest.fn()} setShowModal={jest.fn()} userRole="tutor" />);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('btn-danger');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('hours counted for payment'));
    if (confirmed) await waitFor(() => expect(updateWorkStatusInFirestore).toHaveBeenCalledWith('paid', 'notCompleted'));
    else expect(updateWorkStatusInFirestore).not.toHaveBeenCalled();
});
