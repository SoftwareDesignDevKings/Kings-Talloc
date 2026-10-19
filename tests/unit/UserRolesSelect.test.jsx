import { useState } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserRolesSelect } from '@/components/UserRolesSelect';
import { updateRoleSelection } from '@/utils/userRoleSelection';

test.each([
    ['tutor', ['admin'], ['tutor', 'admin', 'coach'], { role: 'tutor', userRoles: ['admin', 'coach'] }],
    ['coach', ['admin'], ['coach', 'admin', 'tutor'], { role: 'coach', userRoles: ['admin', 'tutor'] }],
    ['tutor', ['coach', 'admin'], ['coach', 'admin'], { role: 'coach', userRoles: ['admin'] }],
    ['teacher', ['admin'], ['teacher', 'admin', 'tutor'], { role: 'tutor', userRoles: ['admin'] }],
    ['tutor', ['coach', 'admin'], ['tutor', 'coach', 'admin', 'teacher'], { role: 'teacher', userRoles: ['admin'] }],
    ['teacher', ['admin'], ['teacher', 'admin', 'student'], { role: 'student', userRoles: [] }],
    ['student', [], ['student', 'coach'], { role: 'coach', userRoles: [] }],
    ['student', [], ['student', 'admin'], { role: 'admin', userRoles: [] }],
    ['admin', [], ['admin', 'teacher'], { role: 'admin', userRoles: ['teacher'] }],
    ['admin', ['teacher'], ['admin', 'teacher', 'coach'], { role: 'coach', userRoles: ['admin'] }],
    ['teacher', ['admin'], ['admin'], { role: 'admin', userRoles: [] }],
    ['student', [], [], { role: '', userRoles: [] }],
    ['tutor', [], ['tutor', 'admin', 'admin', 'unknown'], { role: 'tutor', userRoles: ['admin'] }],
])('maps %s + %j selected as %j to the expected saved view/access', (role, extras, selected, expected) => {
    expect(updateRoleSelection(role, extras, selected)).toEqual(expected);
});

test.each([
    ['student', []], ['teacher', []], ['teacher', ['admin']], ['admin', []], ['admin', ['teacher']],
    ['tutor', []], ['tutor', ['coach']], ['tutor', ['admin']], ['tutor', ['coach', 'admin']],
    ['coach', []], ['coach', ['tutor']], ['coach', ['admin']], ['coach', ['tutor', 'admin']],
])('preserves an unchanged %s + %j assignment', (role, userRoles) => {
    expect(updateRoleSelection(role, userRoles, [role, ...userRoles])).toEqual({ role, userRoles });
});

test('real multi-select replaces Student, adds compatible access, removes conflicts and supports keyboard/removal', async () => {
    const changed = jest.fn();
    function Field() {
        const [value, setValue] = useState({ role: 'student', userRoles: [] });
        const [open, setOpen] = useState(false);
        return <UserRolesSelect {...value} isOpen={open} onOpenChange={setOpen}
            onChange={next => { setValue(next); changed(next); }} />;
    }
    const user = userEvent.setup(); render(<Field />);
    const choose = async label => {
        await user.click(screen.getByRole('button', { name: 'Roles', exact: true }));
        await user.click(screen.getByRole('option', { name: label, exact: true }));
    };
    await choose('Tutor');
    expect(changed).toHaveBeenLastCalledWith({ role: 'tutor', userRoles: [] });
    await choose('Coach'); await choose('Admin');
    expect(changed).toHaveBeenLastCalledWith({ role: 'tutor', userRoles: ['coach', 'admin'] });
    await user.click(screen.getByRole('button', { name: 'Roles', exact: true }));
    await user.type(screen.getByRole('searchbox', { name: 'Search Roles' }), 'Teacher');
    await act(async () => { await user.keyboard('{ArrowDown}{Enter}'); });
    await waitFor(() => expect(changed).toHaveBeenLastCalledWith({ role: 'teacher', userRoles: ['admin'] }));
    expect(screen.queryByRole('button', { name: 'Remove Tutor' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove Admin' }));
    expect(changed).toHaveBeenLastCalledWith({ role: 'teacher', userRoles: [] });
    const beforeEscape = changed.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Roles', exact: true }));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(changed).toHaveBeenCalledTimes(beforeEscape);
});
