import { act, fireEvent, render, screen } from '@testing-library/react';
import UserRolesManager from '@/components/UserRolesManager';
import { getDocs } from 'firebase/firestore';

jest.mock('@/firestore/firestoreClient', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
    collection: (_db, path) => ({ path }), getDocs: jest.fn(),
    doc: jest.fn(), getDoc: jest.fn(), setDoc: jest.fn(),
}));
jest.mock('@/hooks/useAlert', () => () => ({ addAlert: jest.fn() }));
jest.mock('@untitledui/icons', () => ({ SearchLg: () => null, XClose: () => null }));
jest.mock('@/components/untitled/multi-select', () => ({ MultiSelect: () => null }));
// These checks isolate async data states; browser tests exercise the real shared controls.
jest.mock('@/components/untitled/button', () => ({
    Button: ({ children, onPress, href }) => href ? <a href={href}>{children}</a> : <button onClick={onPress}>{children}</button>,
}));
jest.mock('@/components/untitled/input', () => ({
    Input: ({ value, onChange, 'aria-label': label }) => <input aria-label={label} value={value} onChange={event => onChange(event.target.value)} />,
}));
jest.mock('@/components/untitled/table-card', () => ({ TableCard: { Root: ({ children }) => <div>{children}</div> } }));
jest.mock('@/components/untitled/badge', () => ({ Badge: ({ children }) => <span>{children}</span> }));
jest.mock('@/components/untitled/select', () => ({ Select: () => null }));
jest.mock('@/components/untitled/checkbox', () => ({ Checkbox: () => null }));
jest.mock('@/components/untitled/toggle', () => ({ Toggle: () => null }));
jest.mock('@/components/untitled/modal', () => ({ Dialog: () => null, Modal: () => null, ModalOverlay: () => null }));

const snapshot = { docs: [{ id: 'table@example.edu', data: () => ({ email: 'table@example.edu', name: 'Table Check', role: 'teacher', userRoles: [] }) }] };

afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); });

test('shows loading until the user query finishes, then distinguishes an empty user list', async () => {
    let resolveUsers;
    getDocs.mockImplementation(ref => ref.path === 'users'
        ? new Promise(resolve => { resolveUsers = resolve; }) : Promise.resolve({ docs: [] }));
    render(<UserRolesManager />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading users…');
    expect(screen.queryByText('No users yet')).not.toBeInTheDocument();
    await act(async () => { resolveUsers({ docs: [] }); });
    expect(screen.getByRole('status')).toHaveTextContent('No users yet');
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
    expect(screen.getByText('0 of 0 users')).toBeInTheDocument();
});

test('query failure shows a retry action and recovery loads users without reloading coverage', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    let attempts = 0;
    getDocs.mockImplementation(ref => ref.path !== 'users' ? Promise.resolve({ docs: [] })
        : ++attempts === 1 ? Promise.reject(new Error('Fixture unavailable')) : Promise.resolve(snapshot));
    render(<UserRolesManager />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load users. Please try again.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Table Check')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('1 of 1 users')).toBeInTheDocument();
    expect(attempts).toBe(2);
    expect(getDocs.mock.calls.filter(([ref]) => ref.path === 'canvasCourses')).toHaveLength(1);
});
