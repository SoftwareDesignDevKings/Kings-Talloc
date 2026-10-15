import React from 'react';
import { render, screen } from '@testing-library/react';
import EventsList from '@/components/dashboard/EventsList';

const events = [
    { id: 'approved', title: 'Group session', createdByStudent: true, approvalStatus: 'approved', workType: 'work', start: new Date('2027-04-06T05:00Z'), end: new Date('2027-04-06T06:00Z'), students: [{ value: 'student@school.test' }] },
    { id: 'pending', title: 'Student request', createdByStudent: true, approvalStatus: 'pending', workType: 'work', start: new Date('2027-04-06T06:00Z'), end: new Date('2027-04-06T07:00Z') },
];
test.each(['tutor', 'coach'])('%s sees session details without approval badges in either event list', userRole => {
    render(<><EventsList events={events} title="Today" userRole={userRole} isToday /><EventsList events={events} title="Upcoming" userRole={userRole} /></>);
    expect(screen.getAllByText('Group session')).toHaveLength(2);
    expect(screen.getAllByText('1 student')).toHaveLength(2);
    expect(screen.queryByText('Approved')).not.toBeInTheDocument();
    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
});
test.each(['teacher', 'admin', 'student'])('%s retains approval badges for requests', userRole => {
    render(<EventsList events={events} title="Upcoming" userRole={userRole} />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
});
