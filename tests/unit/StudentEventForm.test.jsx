import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import StudentEventForm from '@/components/forms/StudentEventForm.jsx';
import { useAppData } from '@/contexts/AppDataContext';

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
    default: ({ options = [], value, onChange, inputId, 'aria-label': ariaLabel }) => (
        <select
            id={inputId}
            aria-label={ariaLabel}
            value={value?.value || ''}
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
    test('uses Canvas class selection instead of legacy subject selection', () => {
        const setNewEvent = jest.fn();
        useAppData.mockReturnValue({
            setCalendarStudentRequests: jest.fn(),
            calendarStudentRequests: [],
            calendarAvailabilities: [],
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
                newEvent={{
                    start: new Date('2026-05-04T10:00:00'),
                    end: new Date('2026-05-04T11:00:00'),
                    students: [],
                    staff: [],
                    classes: [],
                }}
                setNewEvent={setNewEvent}
                setShowStudentModal={jest.fn()}
                studentEmail="student@example.edu"
            />,
        );

        expect(screen.getByLabelText('Select class')).toBeInTheDocument();
        expect(screen.queryByLabelText('Select subject')).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Select class'), { target: { value: '123' } });
        expect(setNewEvent).toHaveBeenCalledWith(expect.any(Function));
        const updater = setNewEvent.mock.calls
            .map(([call]) => call)
            .find((call) => typeof call === 'function' && call({}).classes);
        expect(updater({})).toEqual({
            classes: [{ value: '123', label: 'Mathematics Year 10 (MATH10)' }],
        });
    });
});
