import { adminCalendarStrategy, teacherCalendarStrategy, tutorCalendarStrategy, coachCalendarStrategy, studentCalendarStrategy, CalendarEntityType } from '@/lib/patterns/calendarStrategy';

const strategies = { admin: adminCalendarStrategy, teacher: teacherCalendarStrategy, tutor: tutorCalendarStrategy, coach: coachCalendarStrategy, student: studentCalendarStrategy };
// Document active UI flows only; legacy response palettes have no accept/decline controls.
const entries = [
    { key: 'availabilityHeatmap', label: 'Available slots', description: 'Available tutors; darker green means more tutors.' },
    { key: 'availabilityBlock', label: 'Availability block', description: 'Your availability, shown with a dotted outline.' },
    { key: 'confirmed', label: 'Confirmed', description: 'Scheduled tutoring or work sessions.' },
    { key: 'coaching', label: 'Coaching', description: 'Scheduled coaching sessions.' },
    { key: 'pending', label: 'Pending', description: 'Booking requests awaiting approval.' },
    { key: 'denied', label: 'Denied', description: 'Booking requests that were denied.' },
    { key: 'completed', label: 'Completed', description: 'Tutoring or work marked completed.' },
    { key: 'coachingCompleted', label: 'Coaching completed', description: 'Coaching marked completed.' },
    { key: 'notAttended', label: 'Did not attend', description: 'The student did not attend the session.' },
];

export function getCalendarColourGuide(userRole) {
    const strategy = strategies[userRole]?.('guide@example.invalid');
    if (!strategy) return [];
    const hasRequests = strategy.firestoreConstraints.studentRequests() !== null;
    return entries.filter(({ key }) => {
        if (key === 'availabilityHeatmap') return strategy.visibility.showAvailabilitySlots;
        if (key === 'availabilityBlock') return strategy.visibility.includeInCalendar({ entityType: CalendarEntityType.AVAILABILITY });
        if (['pending', 'denied'].includes(key)) return hasRequests;
        return strategy.visibility.includeInCalendar({ entityType: CalendarEntityType.SHIFT });
    });
}
