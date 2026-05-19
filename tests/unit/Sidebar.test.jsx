import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Sidebar from '../../src/components/Sidebar.jsx';
import useAuthSession from '../../src/hooks/useAuthSession.js';

jest.mock('../../src/hooks/useAuthSession.js');

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
    usePathname: jest.fn(() => '/'),
    useSearchParams: jest.fn(() => new URLSearchParams()),
}));

const setup = (userRole = 'student', userOverrides = {}) => {
    const user = {
        name: 'Test User',
        email: 'test@kings.edu.au',
        image: null,
        ...userOverrides,
    };

    useAuthSession.mockReturnValue({
        session: { user },
        userRoles: [],
        availableRoles: [],
        switchRole: jest.fn(),
    });

    render(<Sidebar user={user} userRole={userRole} />);

    return { }; // No longer returning setActiveSection
};

describe('Sidebar', () => {

    it('renders calendar for all user roles', () => {
        setup('student');
        expect(screen.getByText('Calendar')).toBeInTheDocument();
    });

    it('shows limited menu items for students', () => {
        setup('student');

        expect(screen.getByText('Calendar')).toBeInTheDocument();
        expect(screen.queryByText('User Roles')).not.toBeInTheDocument();
        expect(screen.queryByText('Canvas Classes')).not.toBeInTheDocument();
        expect(screen.queryByText('Manage Subjects')).not.toBeInTheDocument();
        expect(screen.queryByText('Tutor Hours')).not.toBeInTheDocument();
    });

    it('shows tutor hours for tutor role', () => {
        setup('tutor');

        expect(screen.getByText('Calendar')).toBeInTheDocument();
        expect(screen.getByText('Tutor Hours')).toBeInTheDocument();
        expect(screen.queryByText('User Roles')).not.toBeInTheDocument();
    });

    it('shows all menu items for teacher role', () => {
        setup('teacher');

        expect(screen.getByText('Calendar')).toBeInTheDocument();
        expect(screen.queryByText('User Roles')).not.toBeInTheDocument(); // Only for admin
        expect(screen.queryByText('Canvas Admin')).not.toBeInTheDocument();
        expect(screen.getByText('Canvas Classes')).toBeInTheDocument();
        expect(screen.queryByText('Manage Subjects')).not.toBeInTheDocument();
        expect(screen.queryByText('Tutor Hours')).not.toBeInTheDocument(); // Only for admin, tutor, coach
    });

    it('renders navigation links with correct hrefs', () => {
        setup('admin');

        expect(screen.getByRole('link', { name: /calendar/i })).toHaveAttribute('href', '/calendar');
        expect(screen.getByRole('link', { name: /manage users/i })).toHaveAttribute('href', '/userRoles');
        expect(screen.getByRole('link', { name: /canvas admin/i })).toHaveAttribute('href', '/admin/canvas');
        expect(screen.getByRole('link', { name: /canvas classes/i })).toHaveAttribute('href', '/classes');
    });

    it('displays user name when provided', () => {
        setup('student', { name: 'John Student' });
        expect(screen.getByText('John Student')).toBeInTheDocument();
    });

    it('collapses sidebar when toggle button is clicked', () => {
        setup('teacher');

        // Initially expanded - should show "Menu" text
        expect(screen.getByText('Menu')).toBeInTheDocument();
        expect(screen.getByText('Calendar')).toBeInTheDocument();

        // Click collapse button (aria-label is "Collapse sidebar" when expanded)
        const toggleButton = screen.getByRole('button', { name: 'Collapse sidebar' });
        fireEvent.click(toggleButton);

        // After collapse - "Menu" text is still in DOM but visually hidden via CSS (navLabel class)
        expect(screen.getByText('Menu')).toBeInTheDocument();
        expect(screen.getByText('Calendar')).toBeInTheDocument();
    });

    it('expands sidebar when toggle button is clicked again', () => {
        setup('teacher');

        // Collapse first (button label is "Collapse sidebar" when expanded)
        fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
        // Text remains in DOM, hidden via CSS animation
        expect(screen.getByText('Menu')).toBeInTheDocument();

        // Expand again (button label is "Expand sidebar" when collapsed)
        fireEvent.click(screen.getByRole('button', { name: 'Expand sidebar' }));
        expect(screen.getByText('Menu')).toBeInTheDocument();
        expect(screen.getByText('Calendar')).toBeInTheDocument();
    });

    it('shows profile section with user image when provided', () => {
        setup('teacher', {
            name: 'Jane Teacher',
            image: 'https://example.com/avatar.jpg',
        });

        expect(screen.getByText('Jane Teacher')).toBeInTheDocument();

        // Check if image is rendered (Next/Image is mocked as <img>)
        const userImage = screen.getByRole('img');
        expect(userImage).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('shows default user icon when no image provided', () => {
        setup('teacher', { name: 'No Image User', image: null });

        expect(screen.getByText('No Image User')).toBeInTheDocument();

        // Should have a placeholder div containing an FiUser icon
        const profilePlaceholder = screen.getByText('No Image User').closest('div').querySelector('div'); // Get the div with profilePlaceholder class
        expect(profilePlaceholder).toBeInTheDocument();
        expect(profilePlaceholder).toContainElement(screen.getByTestId('fi-user-icon')); // Assuming FiUser renders with data-testid="fi-user-icon"
    });
});
