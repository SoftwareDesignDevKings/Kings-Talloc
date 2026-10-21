import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WelcomeModal from '@/components/modals/WelcomeModal';
import { getDoc, updateDoc } from 'firebase/firestore';

jest.mock('@/firestore/firestoreClient', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({ doc: (_db, collection, id) => ({ collection, id }), getDoc: jest.fn(), updateDoc: jest.fn() }));

beforeEach(() => {
    jest.clearAllMocks();
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ hasSeenWelcome: false }) });
    updateDoc.mockResolvedValue();
});

test.each(['Get started', 'Close', 'Escape'])('first student visit shows existing content and %s saves only the welcome flag', async close => {
    const user = userEvent.setup(); render(<WelcomeModal userRole="student" userEmail="guide@example.edu" />);
    const dialog = await screen.findByRole('dialog', { name: 'Welcome to Kings Talloc' });
    expect(dialog).toHaveTextContent('Calendar colour guide');
    expect(dialog).toHaveTextContent('All tutoring session bookings must be made through the Calendar tab.');
    if (close === 'Escape') await user.keyboard('{Escape}');
    else await user.click(screen.getByRole('button', { name: close, exact: true }));
    await waitFor(() => expect(updateDoc).toHaveBeenCalledWith({ collection: 'users', id: 'guide@example.edu' }, { hasSeenWelcome: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(updateDoc).toHaveBeenCalledTimes(1);
});
test.each(['teacher', 'tutor', 'coach', 'admin'])('%s does not fetch or receive the student welcome', role => {
    render(<WelcomeModal userRole={role} userEmail="guide@example.edu" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(getDoc).not.toHaveBeenCalled(); expect(updateDoc).not.toHaveBeenCalled();
});
test.each([true, undefined])('a seen or missing user record does not open welcome (%s)', async seen => {
    getDoc.mockResolvedValue({ exists: () => seen !== undefined, data: () => ({ hasSeenWelcome: seen }) });
    render(<WelcomeModal userRole="student" userEmail="guide@example.edu" />);
    await waitFor(() => expect(getDoc).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(updateDoc).not.toHaveBeenCalled();
});
