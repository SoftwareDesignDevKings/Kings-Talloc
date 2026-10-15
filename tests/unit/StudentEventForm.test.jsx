import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StudentEventForm from '@/components/forms/StudentEventForm.jsx';
import { useAppData } from '@/contexts/AppDataContext';
import { createEventInFirestore } from '@/firestore/firestoreOperations';

jest.mock('@/hooks/useBookableAvailability', () => { const state = { ready: true, slots: [{ tutor: 'tutor@example.edu', start: new Date('2026-05-04T09:00:00'), end: new Date('2026-05-04T12:00:00') }] }; return () => state; });

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

jest.mock('react-select/async', () => ({
    __esModule: true,
    default: ({ value, onChange, isDisabled }) => <div>
        <span data-testid="group-students">{value.map(student => student.value).join(',')}</span>
        <button type="button" disabled={isDisabled} onClick={() => onChange([...value, { value: 'peer@example.edu', label: 'Casey Example' }])}>Select Casey</button>
        <button type="button" disabled={isDisabled} onClick={() => onChange([])}>Clear group</button>
    </div>,
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
            bookableAvailability: { ready: true, slots: [{ tutor: 'tutor@example.edu', start: new Date('2026-05-04T09:00:00'), end: new Date('2026-05-04T12:00:00') }] },
            calendarAvailabilities: [{
                tutor: 'tutor@example.edu',
                start: new Date('2026-05-04T09:00:00'),
                end: new Date('2026-05-04T12:00:00'),
                workType: 'tutoring',
            }],
            tutors: [{ email: 'tutor@example.edu', name: 'Tutor One' }],
            studentTutorEligibility: {
                coverageKeys: ['blueprint:senx'],
                eligibleTutorEmails: ['tutor@example.edu'],
                eligibleTutors: [{
                    email: 'tutor@example.edu',
                    subjectCodes: ['SEN'],
                }],
            },
            classes: [{
                id: '123',
                name: 'Mathematics Year 10',
                courseCode: 'MATH10',
                students: [{ email: 'student@example.edu', name: 'Student One' }],
            }],
            ...overrides.appData,
        });

        function Editor() {
            const [draft, setDraft] = useState(newEvent);
            return <StudentEventForm mode={overrides.mode || 'create'} newEvent={draft} setNewEvent={value => { setNewEvent(value); setDraft(value); }} setShowStudentModal={jest.fn()} studentEmail="student@example.edu" />;
        }
        render(<Editor />);

        return { setNewEvent, newEvent };
    };

    test('does not expose class or subject selection for student-created requests', () => {
        renderForm();

        expect(screen.queryByLabelText('Select class')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Select subject')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Other students (optional)')).not.toBeInTheDocument();
    });

    test('labels eligible tutors with shared subjects', async () => {
        renderForm();

        expect(await screen.findByRole('option', { name: 'Tutor One (SEN)' })).toBeInTheDocument();
    });

    test('labels tutors with multiple shared subjects', async () => {
        renderForm({
            appData: {
                studentTutorEligibility: {
                    coverageKeys: ['blueprint:sen', 'blueprint:enc'],
                    eligibleTutorEmails: ['tutor@example.edu'],
                    eligibleTutors: [{
                        email: 'tutor@example.edu',
                        subjectCodes: ['ENC', 'SEN'],
                    }],
                },
            },
        });

        expect(await screen.findByRole('option', { name: 'Tutor One (ENC, SEN)' })).toBeInTheDocument();
    });

    test('falls back to tutor name when no shared subject label is available', async () => {
        renderForm({
            appData: {
                studentTutorEligibility: {
                    coverageKeys: ['course:robotics'],
                    eligibleTutorEmails: ['tutor@example.edu'],
                    eligibleTutors: [{
                        email: 'tutor@example.edu',
                        subjectCodes: [],
                    }],
                },
            },
        });

        expect(await screen.findByRole('option', { name: 'Tutor One' })).toBeInTheDocument();
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
            expect(screen.getByLabelText('Assign tutor to event')).toHaveTextContent('Tutor One (SEN)');
        });
        fireEvent.change(screen.getByLabelText('Assign tutor to event'), { target: { value: 'tutor@example.edu' } });
        fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

        await waitFor(() => {
            expect(createEventInFirestore).toHaveBeenCalledWith(
                expect.objectContaining({
                    classes: [],
                    students: newEvent.students,
                    staffEmails: ['tutor@example.edu'],
                    studentEmails: ['student@example.edu'],
                }),
                'studentEventRequests',
            );
        });

        expect(setNewEvent).toHaveBeenCalled();
    });
    test('selected peers are submitted with the requester and remain pending', async () => {
        renderForm({ newEvent: { staff: [{ value: 'tutor@example.edu', label: 'Tutor One' }] } });
        fireEvent.click(screen.getByText('Select Casey'));
        expect(screen.getByTestId('group-students')).toHaveTextContent('student@example.edu,peer@example.edu');
        fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
        await waitFor(() => expect(createEventInFirestore).toHaveBeenCalledWith(expect.objectContaining({
            students: [{ value: 'student@example.edu', label: 'student@example.edu' }, { value: 'peer@example.edu', label: 'Casey Example' }],
            studentEmails: ['student@example.edu', 'peer@example.edu'], requesterEmail: 'student@example.edu', approvalStatus: 'pending', additionalStudents: [],
        }), 'studentEventRequests'));
    });
    test('clearing group selections keeps the requester included', () => {
        renderForm({ newEvent: { students: [{ value: 'peer@example.edu', label: 'Casey' }] } });
        fireEvent.click(screen.getByText('Clear group'));
        expect(screen.getByTestId('group-students')).toHaveTextContent(/^student@example.edu$/);
    });
    test('approved/view-only groups cannot change participants', () => {
        renderForm({ mode: 'view', newEvent: { students: [{ value: 'student@example.edu' }, { value: 'peer@example.edu' }] } });
        expect(screen.getByText('Select Casey')).toBeDisabled();
        expect(screen.getByText('Clear group')).toBeDisabled();
    });

});
