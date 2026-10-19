import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentList from '@/components/StudentList';

test('preserves student order and the optional existing removal callback', async () => {
    const first = { name: 'Jane Student', email: 'jane@example.edu' };
    const second = { name: '', email: 'alex@example.edu' };
    const cls = { id: 'math', students: [first, second] };
    const confirmRemoveStudent = jest.fn();
    render(<StudentList cls={cls} confirmRemoveStudent={confirmRemoveStudent} />);
    const items = within(screen.getByRole('list', { name: 'Enrolled students' })).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('Jane Student')).toBeInTheDocument();
    expect(within(items[1]).getByText('No name')).toBeInTheDocument();
    await userEvent.setup().click(within(items[0]).getByRole('button', { name: 'Remove', exact: true }));
    expect(confirmRemoveStudent).toHaveBeenCalledTimes(1);
    expect(confirmRemoveStudent).toHaveBeenCalledWith(cls, first);
});
