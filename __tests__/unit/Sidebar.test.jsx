import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Sidebar from '../../src/components/Sidebar.jsx';
import { useRouter } from 'next/navigation';

// Mock useRouter from next/navigation globally or for this test file
// The jest.setup.js file should already have a global mock for 'next/navigation'
// We need to access the mocked push function.
const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
};

jest.mock('next/navigation', () => ({
    useRouter: () => mockRouter,
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

    render(<Sidebar userRole={userRole} user={user} />);

    return { }; // No longer returning setActiveSection
};

describe('Sidebar', () => {
    beforeEach(() => {
        mockRouter.push.mockClear(); // Clear mock calls before each test
    });

    it('renders calendar for all user roles', () => {
        setup('student');
        expect(screen.getByText('Calendar')).toBeInTheDocument();
    });

    it('shows limited menu items for students', () => {
        setup('student');

        expect(screen.getByText('Calendar')).toBeInTheDocument();
        expect(screen.queryByText('User Roles')).not.toBeInTheDocument();
        expect(screen.queryByText('Manage Classes')).not.toBeInTheDocument();
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
        expect(screen.getByText('User Roles')).toBeInTheDocument();
        expect(screen.getByText('Manage Classes')).toBeInTheDocument();
        expect(screen.getByText('Manage Subjects')).toBeInTheDocument();
        expect(screen.getByText('Tutor Hours')).toBeInTheDocument();
    });

    it('calls router.push when menu item is clicked', () => {
        setup('teacher');

        fireEvent.click(screen.getByText('Calendar'));
        expect(mockRouter.push).toHaveBeenCalledWith('calendar');

        fireEvent.click(screen.getByText('User Roles'));
        expect(mockRouter.push).toHaveBeenCalledWith('userRoles');

        fireEvent.click(screen.getByText('Manage Classes'));
        expect(mockRouter.push).toHaveBeenCalledWith('classes');
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

        // Click collapse button
        const toggleButton = screen.getByRole('button');
        fireEvent.click(toggleButton);

        // After collapse - "Menu" text should be hidden
        expect(screen.queryByText('Menu')).not.toBeInTheDocument();
        expect(screen.queryByText('Calendar')).not.toBeInTheDocument();
    });

    it('expands sidebar when toggle button is clicked again', () => {
        setup('teacher');

        const toggleButton = screen.getByRole('button');

        // Collapse first
        fireEvent.click(toggleButton);
        expect(screen.queryByText('Menu')).not.toBeInTheDocument();

        // Expand again
        fireEvent.click(toggleButton);
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
