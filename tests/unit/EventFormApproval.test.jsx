import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { calendarEventCreateTeamsMeeting } from '@/utils/calendarEvent';
import EventForm from '@/components/forms/EventForm';
import { createEventInFirestore, createScheduledEventInFirestore, updateEventInFirestore } from '@/firestore/firestoreOperations';

const mockApprove = jest.fn();
const mockSubmitResult = jest.fn();
jest.mock('@/utils/calendarEvent', () => ({ calendarEventCreateTeamsMeeting: jest.fn() }));
jest.mock('@/hooks/useApprovalHandlers', () => ({ useApprovalHandlers: () => ({ handleApprove: mockApprove }) }));
jest.mock('@/hooks/useAlert', () => () => ({ addAlert: jest.fn() }));
jest.mock('@/contexts/AppDataContext', () => ({ useAppData: () => ({ calendarShifts: [] }) }));
jest.mock('@/components/forms/useEventFormData', () => ({ useEventFormData: () => ({ staffOptions: [], classOptions: [], studentOptions: [] }) }));
jest.mock('@/firestore/firestoreOperations', () => ({ createEventInFirestore: jest.fn(), createScheduledEventInFirestore: jest.fn(), updateEventInFirestore: jest.fn() }));
jest.mock('@/components/forms/EventFormSections/EventDetailsSection', () => () => null);
jest.mock('@/components/forms/EventFormSections/ParticipantsSection', () => () => null);
jest.mock('@/components/forms/EventFormSections/SettingsSection', () => () => null);
jest.mock('@/components/forms/EventFormSections/StudentRequestSection', () => () => null);
jest.mock('@/components/modals/DeleteConfirmationModal', () => () => null);
jest.mock('@/components/forms/EventFormSections/EventFormUI', () => ({
    EventFormUIContext: require('react').createContext({}),
    StaffEventDialog: ({ onSubmit, loading }) => <button disabled={loading} onClick={async () => mockSubmitResult(await onSubmit({ preventDefault() {} }))}>Save</button>,
}));

test.each([true, false])('calendar approval uses the shared transaction path and propagates success=%s', async (success) => {
    jest.clearAllMocks();
    mockApprove.mockResolvedValue(success);
    const request = { id: 'request', isStudentRequest: true };
    const edits = {
        title: 'Edited request', start: new Date('2027-02-01T04:00:00Z'), end: new Date('2027-02-01T05:00:00Z'),
        createdByStudent: true, approvalStatus: 'approved', students: [{ value: 'student@kings.edu.au' }], workType: 'tutoring', staff: [{ value: 'tutor@kings.edu.au' }],
    };
    render(<EventForm mode="edit" eventToEdit={request} newEvent={edits} setNewEvent={jest.fn()} setShowModal={jest.fn()} userRole="teacher" userEmail="teacher@kings.edu.au" />);
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(mockSubmitResult).toHaveBeenCalledWith(success));
    expect(mockApprove).toHaveBeenCalledWith(request, expect.objectContaining({
        title: edits.title, start: edits.start, end: edits.end, staff: edits.staff, createTeamsMeeting: true,
    }));
    expect(createEventInFirestore).not.toHaveBeenCalled();
    expect(updateEventInFirestore).not.toHaveBeenCalled();
});

test('new recurring events pass committed skipped dates to Teams instead of the unsaved draft', async () => {
    jest.clearAllMocks();
    const draft = { title: 'Series', start: new Date('2027-02-01T04:00:00Z'), end: new Date('2027-02-01T05:00:00Z'), staff: [{ value: 'tutor@school.test' }], students: [], recurring: 'weekly', occurenceNum: 3, createTeamsMeeting: true, workType: 'work' };
    const committed = { ...draft, approvalStatus: 'approved', eventExceptions: [1] };
    createScheduledEventInFirestore.mockResolvedValue({ id: 'saved-series', eventData: committed });
    calendarEventCreateTeamsMeeting.mockResolvedValue();
    render(<EventForm mode="create" newEvent={draft} setNewEvent={jest.fn()} setShowModal={jest.fn()} userRole="teacher" userEmail="teacher@school.test" />);
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(calendarEventCreateTeamsMeeting).toHaveBeenCalledWith('saved-series', committed, expect.any(Object)));
    expect(draft).not.toHaveProperty('eventExceptions');
});
