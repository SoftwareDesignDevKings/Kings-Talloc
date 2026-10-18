import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DeleteConfirmationModal from '@/components/modals/DeleteConfirmationModal';
import PendingApprovalItem from '@/components/dashboard/cards/PendingApprovalItem';
jest.mock('@/components/modals/BaseModal', () => function MockModal({ show, title, children, customFooter }) {
    return show ? <div role="dialog" aria-label={title}>{children}{customFooter}</div> : null;
});
test('deleting a request warns about lost rejection visibility and requires explicit red confirmation', () => {
    const confirm = jest.fn(), cancel = jest.fn();
    render(<DeleteConfirmationModal show onConfirm={confirm} onHide={cancel} isStudentRequest />);
    expect(screen.getByRole('alert')).toHaveTextContent('any rejection notice');
    expect(confirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(cancel).toHaveBeenCalled(); expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('btn-danger');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(confirm).toHaveBeenCalledWith('this');
});
test('deleting a recurring occurrence retains the explicit deletion scope', () => {
    const confirm = jest.fn();
    render(<DeleteConfirmationModal show onConfirm={confirm} onHide={jest.fn()} isRecurring />);
    fireEvent.click(screen.getByLabelText('This and all future occurrences'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(confirm).toHaveBeenCalledWith('thisAndFuture');
});
test('destructive confirmation buttons are locked while the write is in progress', () => {
    render(<DeleteConfirmationModal show loading onConfirm={jest.fn()} onHide={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
});
test('reject and delete controls are both red and respect the processing lock', () => {
    render(<PendingApprovalItem disabled request={{ id: 'a', start: new Date(), end: new Date() }} onApprove={jest.fn()} onReject={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Reject' })).toHaveClass('btn-outline-danger');
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('btn-danger');
    expect(screen.getByRole('button', { name: 'Reject' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
});
