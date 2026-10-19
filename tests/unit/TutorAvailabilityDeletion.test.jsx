import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TutorAvailabilityForm from '@/components/forms/TutorAvailabilityForm';
import { deleteEventFromFirestore } from '@/firestore/firestoreOperations';
const mockResult = jest.fn(), mockSetAvailability = jest.fn();
jest.mock('@/hooks/useAlert', () => () => ({ addAlert: jest.fn() }));
jest.mock('@/contexts/AppDataContext', () => ({ useAppData: () => ({ calendarAvailabilities: [{ id: 'availability' }], setCalendarAvailabilities: mockSetAvailability }) }));
jest.mock('@/firestore/firestoreOperations', () => ({ deleteEventFromFirestore: jest.fn() }));
jest.mock('@/components/modals/BaseModal', () => function MockModal({ deleteButton, loading }) {
    return <button disabled={loading} onClick={async () => mockResult(await deleteButton.onClick())}>Delete</button>;
});
beforeEach(() => { jest.clearAllMocks(); jest.spyOn(window, 'confirm').mockReturnValue(false); deleteEventFromFirestore.mockResolvedValue(); });
test.each([false, true])('availability deletion requires confirmation: %s', async confirmed => {
    window.confirm.mockReturnValue(confirmed);
    const event = { id: 'rendered-fragment', originalAvailabilityId: 'availability', workType: ['work'] };
    render(<TutorAvailabilityForm mode="edit" newAvailability={event} eventToEdit={event} setNewAvailability={jest.fn()} setShowModal={mockResult} userRole="tutor" />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    if (confirmed) await waitFor(() => expect(mockResult).toHaveBeenCalledWith(false));
    else expect(mockResult).not.toHaveBeenCalled();
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Existing approved sessions will remain'));
    if (confirmed) {
        expect(deleteEventFromFirestore).toHaveBeenCalledWith('availability', 'tutorAvailabilities');
        expect(mockSetAvailability).toHaveBeenCalledWith([]);
    } else {
        expect(deleteEventFromFirestore).not.toHaveBeenCalled();
        expect(mockSetAvailability).not.toHaveBeenCalled();
    }
});
