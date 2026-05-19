import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StudentEventForm from '@/components/forms/StudentEventForm.jsx';
import { useAppData } from '@/contexts/AppDataContext';
import { createEventInFirestore } from '@/firestore/firestoreOperations';

jest.mock('@/contexts/AppDataContext', () => ({
    useAppData: jest.fn(),
}));

jest.mock('@/hooks/useAlert.js', () => () => ({
    addAlert: jest.fn(),
}));

jest.mock('@/firestore/firestoreOperations', () => ({
    createEventInFirestore: jest.fn(),
    updateEventInFirestore: jest.fn(),
    deleteEventFromFirestore: jest.fn(),
}));

jest.mock('@/components/modals/BaseModal.jsx', () => ({
    __esModule: true,
    default: ({ children, onSubmit }) => (
        <form onSubmit={onSubmit}>
            {children}
            <button type="submit">Submit</button>
        </form>
    ),
}));

jest.mock('react-select', () => ({
    __esModule: true,
    default: ({ options = [], value, onChange, onMenuOpen, inputId, 'aria-label': ariaLabel }) => (
        <select
            id={inputId}
            aria-label={ariaLabel}
            value={value?.value || ''}
            onFocus={() => onMenuOpen?.()}
            onChange={(event) => onChange(options.find((option) => option.value === event.target.value) || null)}
        >
            <option value="">Select...</option>
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    ),
}));

describe('StudentEventForm', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const renderForm = (overrides = {}) => {
        const setNewEvent = jest.fn();
        const newEvent = {
            start: new Date('2026-05-04T10:00:00'),
            end: new Date('2026-05-04T11:00:00'),
            students: [],
            staff: [],
            classes: [{ value: 'stale-class', label: 'Stale Class' }],
            ...overrides.newEvent,
        };

        useAppData.mockReturnValue({
            setCalendarStudentRequests: jest.fn(),
            calendarStudentRequests: [],
            calendarAvailabilities: [{
                tutor: 'tutor@example.edu',
                start: new Date('2026-05-04T09:00:00'),
                end: new Date('2026-05-04T12:00:00'),
                workType: 'tutoring',
            }],
            tutors: [{ email: 'tutor@example.edu', name: 'Tutor One' }],
            classes: [{
                id: '123',
                name: 'Mathematics Year 10',
                courseCode: 'MATH10',
                students: [{ email: 'student@example.edu', name: 'Student One' }],
            }],
        });

        render(
            <StudentEventForm
                mode="create"
                newEvent={newEvent}
                setNewEvent={setNewEvent}
                setShowStudentModal={jest.fn()}
                studentEmail="student@example.edu"
            />,
        );

        return { setNewEvent, newEvent };
    };

    test('does not expose class or subject selection for student-created requests', () => {
        renderForm();

        expect(screen.queryByLabelText('Select class')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Select subject')).not.toBeInTheDocument();
    });

    test('submits student-created requests with no classes', async () => {
        const { setNewEvent, newEvent } = renderForm({
            newEvent: {
                students: [{ value: 'student@example.edu', label: 'student@example.edu' }],
                staff: [{ value: 'tutor@example.edu', label: 'Tutor One' }],
                preference: 'General',
            },
        });

        createEventInFirestore.mockResolvedValue('request-1');

        fireEvent.focus(screen.getByLabelText('Assign tutor to event'));
        await waitFor(() => {
            expect(screen.getByLabelText('Assign tutor to event')).toHaveTextContent('Tutor One');
        });
        fireEvent.change(screen.getByLabelText('Assign tutor to event'), { target: { value: 'tutor@example.edu' } });
        fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

        await waitFor(() => {
            expect(createEventInFirestore).toHaveBeenCalledWith(
                expect.objectContaining({
                    classes: [],
                    students: newEvent.students,
                    studentEmails: ['student@example.edu'],
                }),
                'studentEventRequests',
            );
        });

        expect(setNewEvent).toHaveBeenCalled();
    });
});
