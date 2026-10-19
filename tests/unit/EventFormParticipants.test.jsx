import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EventForm from '@/components/forms/EventForm';
import { updateEventInFirestore } from '@/firestore/firestoreOperations';
const mockSubmitResult = jest.fn();
jest.mock('@/hooks/useApprovalHandlers', () => ({ useApprovalHandlers: () => ({ handleApprove: jest.fn(), handleReject: jest.fn() }) }));
jest.mock('@/hooks/useAlert', () => () => ({ addAlert: jest.fn() }));
jest.mock('@/contexts/AppDataContext', () => ({ useAppData: () => ({ calendarShifts: [], setCalendarShifts: jest.fn() }) }));
jest.mock('@/components/forms/useEventFormData', () => ({ useEventFormData: () => ({ staffOptions: [], classOptions: [], studentOptions: [] }) }));
jest.mock('@/firestore/firestoreOperations', () => ({ updateEventInFirestore: jest.fn(), queueEmailNotification: jest.fn() }));
jest.mock('@/utils/calendarEvent', () => ({ calendarEventHandleTeamsMeetingUpdate: jest.fn() }));
jest.mock('@/components/forms/EventFormSections/EventDetailsSection', () => () => null);
jest.mock('@/components/forms/EventFormSections/ParticipantsSection', () => function MockParticipants({ selectedStudents, handleStudentSelectChange, children }) { return <div>
    <span data-testid="participants">{selectedStudents.map(student => student.value).join(',')}</span>
    <button onClick={() => handleStudentSelectChange([])}>Remove student</button>
    <button onClick={() => handleStudentSelectChange([{ value: 'replacement@kings.edu.au' }])}>Choose replacement</button>
    {children}
</div>; });
jest.mock('@/components/forms/EventFormSections/SettingsSection', () => () => null);
jest.mock('@/components/forms/EventFormSections/StudentRequestSection', () => () => null);
jest.mock('@/components/modals/DeleteConfirmationModal', () => () => null);
jest.mock('@/components/forms/EventFormSections/EventFormUI', () => ({ EventFormUIContext: require('react').createContext({}), StaffEventDialog: ({ children, onSubmit, loading }) => <div data-testid="editor">{children}<button disabled={loading} onClick={async () => mockSubmitResult(await onSubmit({ preventDefault() {} }))}>Save</button></div> }));
const original = { id: 'session', title: 'Session', start: new Date('2027-04-06T05:00Z'), end: new Date('2027-04-06T06:00Z'), staff: [{ value: 'tutor@kings.edu.au' }], students: [{ value: 'student@kings.edu.au' }], additionalStudents: [], workType: 'work', approvalStatus: 'approved', createdByStudent: true };
function Editor({ event = original }) {
    const [draft, setDraft] = useState(event);
    return <EventForm mode="edit" eventToEdit={draft} newEvent={draft} setNewEvent={setDraft} setShowModal={jest.fn()} userRole="teacher" userEmail="mienna@kings.edu.au" />;
}
beforeEach(() => { jest.clearAllMocks(); updateEventInFirestore.mockResolvedValue({}); });
test('removal is allowed while editing; an empty save stays open, then replacement saves successfully', async () => {
    render(<Editor />);
    fireEvent.click(screen.getByText('Remove student'));
    expect(screen.getByTestId('participants')).toHaveTextContent(''); expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(mockSubmitResult).toHaveBeenCalledWith(false));
    expect(screen.getByRole('alert')).toHaveTextContent('Add at least one student');
    expect(screen.getByTestId('editor')).toBeInTheDocument(); expect(updateEventInFirestore).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Choose replacement'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(mockSubmitResult).toHaveBeenLastCalledWith(true));
    expect(updateEventInFirestore).toHaveBeenCalledWith('session', expect.objectContaining({ students: [{ value: 'replacement@kings.edu.au' }], approvalStatus: 'approved', createdByStudent: true }), 'shifts', 0);
});
test('the separate names box is removed from the teacher editor', () => {
    render(<Editor />);
    expect(screen.queryByLabelText('Other students (optional)')).not.toBeInTheDocument();
});
test('saved general Work cannot acquire student booking behaviour through participant edits', async () => {
    render(<Editor event={{ ...original, students: [], createdByStudent: false }} />);
    fireEvent.click(screen.getByText('Choose replacement'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(mockSubmitResult).toHaveBeenCalledWith(false));
    expect(screen.getByRole('alert')).toHaveTextContent('Create a separate student session');
    expect(updateEventInFirestore).not.toHaveBeenCalled();
});
