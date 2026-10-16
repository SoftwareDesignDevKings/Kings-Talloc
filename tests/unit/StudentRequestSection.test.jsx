import PendingApprovalItem from '@/components/dashboard/cards/PendingApprovalItem';
import { render, screen } from '@testing-library/react';
import StudentRequestSection from '@/components/forms/EventFormSections/StudentRequestSection';
import EventDetailsSection from '@/components/forms/EventFormSections/EventDetailsSection';

test('old approved bookings have a consistent focus section with an explicit fallback', () => {
    const event = { createdByStudent: true, approvalStatus: 'approved' };
    render(<><EventDetailsSection newEvent={event} readOnly /><StudentRequestSection newEvent={event} readOnly /></>);
    expect(screen.getByRole('button', { name: /Session focus/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: /General Information/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Focus not provided')).toBeInTheDocument();
    expect(screen.queryByText('Topics to cover')).not.toBeInTheDocument();
});
test('pending focus opens for review and shows the saved topics as plain text', () => {
    render(<StudentRequestSection newEvent={{ createdByStudent: true, approvalStatus: 'pending', preference: 'Exam Help', sessionTopics: '<b>Algebra</b>\nQuestions 4–8' }} readOnly />);
    expect(screen.getByRole('button', { name: /Session focus/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Exam preparation')).toBeInTheDocument();
    expect(screen.getByText('Topics to cover')).toBeInTheDocument();
    expect(screen.getByText(/<b>Algebra<\/b>/)).toBeInTheDocument();
});

test('teacher-created student sessions also have the fallback without claiming student submission', () => {
    render(<StudentRequestSection newEvent={{ workType: 'work', students: [{ value: 'student@school.test' }], createdByStudent: false, approvalStatus: 'approved' }} readOnly />);
    expect(screen.getByText('Focus not provided')).toBeInTheDocument();
    expect(screen.queryByText('STUDENT SUBMITTED')).not.toBeInTheDocument();
});
test('the approval list includes focus and expandable topics before any decision', () => {
    render(<PendingApprovalItem request={{ title: 'Request', start: new Date('2027-04-06T05:00Z'), end: new Date('2027-04-06T06:00Z'), preference: 'Assignments', sessionTopics: 'Essay structure' }} readOnly />);
    expect(screen.getByText('Assignment')).toBeInTheDocument();
    expect(screen.getByText('Topics to cover').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByText('Essay structure')).toBeInTheDocument();
});
