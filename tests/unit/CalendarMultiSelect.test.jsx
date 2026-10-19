import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalendarMultiSelect from '@/components/calendar/CalendarMultiSelect';

const tutor = { value: 'tutor@example.edu', label: 'Tutor One', roles: ['tutor'], locationType: 'remote' };
const coach = { value: 'coach@example.edu', label: 'Coach Two', roles: ['coach'], locationType: 'onsite' };
const changed = jest.fn();
function Field({ initial = [], isMulti = true, ...props }) {
    const [value, setValue] = useState(initial);
    return <CalendarMultiSelect aria-label="People" inputId="people" placeholder="Select..." options={[tutor, coach]}
        value={value} isMulti={isMulti} onChange={next => { changed(next); setValue(next); }} {...props} />;
}
const open = async user => { await user.click(screen.getByRole('button', { name: 'People', exact: true })); return screen.getByRole('searchbox', { name: 'Search People' }); };
beforeEach(() => jest.clearAllMocks());

test('search, keyboard selection and Backspace preserve full option objects and order', async () => {
    const user = userEvent.setup(); render(<Field initial={[tutor]} />);
    const search = await open(user); await user.type(search, 'coach');
    expect(screen.queryByRole('option', { name: 'Tutor One' })).not.toBeInTheDocument();
    await user.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(changed).toHaveBeenLastCalledWith([tutor, coach]));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: 'People', exact: true })).toHaveFocus());
    await user.keyboard('{Backspace}'); expect(changed).toHaveBeenLastCalledWith([tutor]);
});
test('each chip can be removed and clear restores an empty array without opening the menu', async () => {
    const user = userEvent.setup(); render(<Field initial={[tutor, coach]} />);
    await user.click(screen.getByRole('button', { name: 'Remove Tutor One' }));
    expect(changed).toHaveBeenLastCalledWith([coach]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear People' }));
    expect(changed).toHaveBeenLastCalledWith([]);
});
test('an existing legacy selection absent from the options survives adding a new type', async () => {
    const legacy = { value: 'work', label: 'Work' };
    const user = userEvent.setup(); const saved = { ...tutor, label: 'Saved Tutor Name', locationType: 'onsite' };
    render(<Field initial={[legacy, saved]} />);
    await open(user); await user.click(screen.getByRole('option', { name: 'Coach Two' }));
    expect(changed).toHaveBeenLastCalledWith([legacy, saved, coach]);
});
test('single tutor assignment replaces its value and preserves its existing no-options message', async () => {
    const user = userEvent.setup(); render(<Field initial={tutor} isMulti={false} noOptionsMessage={() => 'No eligible tutors available for the selected time range'} />);
    const search = await open(user); await user.type(search, 'missing');
    expect(screen.getByText('No eligible tutors available for the selected time range')).toBeInTheDocument();
    await user.clear(search); await user.click(screen.getByRole('option', { name: 'Coach Two' }));
    expect(changed).toHaveBeenLastCalledWith(coach);
    await open(user); await user.click(screen.getByRole('option', { name: 'Coach Two' }));
    expect(changed).toHaveBeenLastCalledWith(coach);
    expect(screen.queryByRole('button', { name: /Remove|Clear/ })).not.toBeInTheDocument();
});
test('Escape clears the search, restores trigger focus and leaves selections unchanged', async () => {
    const user = userEvent.setup(); render(<Field initial={[tutor]} />);
    const search = await open(user); await user.type(search, 'coach'); await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: 'People', exact: true })).toHaveFocus()); expect(changed).not.toHaveBeenCalled();
    expect(await open(user)).toHaveValue('');
});
test('disabled controls cannot open, remove or clear their selection', () => {
    render(<Field initial={[tutor]} isDisabled />);
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
    expect(changed).not.toHaveBeenCalled();
});
