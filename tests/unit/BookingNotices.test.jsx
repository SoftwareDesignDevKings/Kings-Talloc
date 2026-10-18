import React from 'react';
import { render, screen } from '@testing-library/react';
import BookingNotices from '@/components/dashboard/BookingNotices';
import { onSnapshot } from 'firebase/firestore';
jest.mock('@/firestore/firestoreClient', () => ({ db: {} }));
jest.mock('@/hooks/useAuthSession', () => () => ({ session: { user: { email: 'tutor@kings.edu.au' } } }));
jest.mock('firebase/firestore', () => ({
    collection: (_db, path) => ({ path }), doc: (_db, path) => ({ path }), query: ref => ref, where: jest.fn(),
    onSnapshot: jest.fn(), runTransaction: jest.fn(), serverTimestamp: jest.fn(),
}));
const notice = (kind, message) => ({ id: kind, data: () => ({ kind, message, title: 'Session', createdAt: { toMillis: () => 100 }, start: { toDate: () => new Date('2027-04-06T05:00Z') } }) });
const snapshots = docs => onSnapshot.mockImplementation((ref, callback) => {
    callback(ref.path === 'bookingNotifications' ? { docs, metadata: { fromCache: false } } : { data: () => ({}) });
    return jest.fn();
});
beforeEach(() => jest.clearAllMocks());
test('existing assignment notices no longer display a banner or dismiss button', () => {
    snapshots([notice('assigned', 'A student session has been assigned to you.')]);
    render(<BookingNotices />);
    expect(screen.queryByLabelText('Booking updates')).not.toBeInTheDocument();
    expect(screen.queryByText('Dismiss updates')).not.toBeInTheDocument();
});
test.each(['approved', 'denied', 'coverage-lost'])('%s updates remain visible while assignment notices are hidden', kind => {
    snapshots([notice('assigned', 'A student session has been assigned to you.'), notice(kind, 'Important retained update')]);
    render(<BookingNotices />);
    expect(screen.getByLabelText('Booking updates')).toHaveTextContent('Important retained update');
    expect(screen.queryByText('A student session has been assigned to you.')).not.toBeInTheDocument();
});
