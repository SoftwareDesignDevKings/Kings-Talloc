/**
 * Calendar UI helper functions
 * All functions prefixed with 'calendarUI'
 */

import { CALENDAR_COLOURS, getAvailabilityHeatColor, getCalendarPaletteStyle } from '@/constants/calendarColours';

// Helper function to calculate the green color intensity based on the number of available tutors
const calculateGreenIntensity = getAvailabilityHeatColor;

/**
 * Get event style based on event type and status
 */
export const calendarUIGetEventStyle = (event, userRole, userEmail) => {
    // Figure out what type of event this is
    const isAvailability = event.tutor !== undefined && event.tutor !== null;
    const isStudentRequest = event.isStudentRequest === true;
    const isStudentEvent = event.createdByStudent === true;

    const applyPalette = ({ bg, border, text }) => {
        backgroundColor = bg;
        borderColor = border;
        color = text || 'black';
    };

    // Default confirmed tutoring/work session style
    let backgroundColor = CALENDAR_COLOURS.confirmed.bg;
    let borderColor = CALENDAR_COLOURS.confirmed.border;
    let color = CALENDAR_COLOURS.confirmed.text;
    let borderStyle = 'solid';

    // --- Student-created events ---
    if (isStudentEvent) {
        if (event.approvalStatus === 'pending') {
            applyPalette(CALENDAR_COLOURS.pending);
        } else if (event.approvalStatus === 'denied') {
            applyPalette(CALENDAR_COLOURS.denied);
        }
    }

    // --- Work type and status combined ---
    if (event.workType === 'coaching' && event.workStatus === 'completed') {
        applyPalette(CALENDAR_COLOURS.coachingCompleted);
    } else if (event.workType === 'coaching' && event.workStatus === 'notCompleted') {
        applyPalette(CALENDAR_COLOURS.coaching);
    } else if (event.workStatus === 'completed') {
        applyPalette(CALENDAR_COLOURS.completed);
    } else if (event.workStatus === 'notAttended') {
        applyPalette(CALENDAR_COLOURS.notAttended);
    }
    // Other not completed work keeps the default confirmed blue.

    // --- Student requests (pending approval) ---
    if (isStudentRequest) {
        if (event.approvalStatus === 'denied') {
            applyPalette(CALENDAR_COLOURS.denied);
        } else {
            applyPalette(CALENDAR_COLOURS.pending);
        }
    }

    // --- Tutor availability blocks ---
    if (isAvailability) {
        applyPalette(CALENDAR_COLOURS.availabilityBlock);
        borderStyle = CALENDAR_COLOURS.availabilityBlock.borderStyle;
    }

    // Solid events use a prominent left accent + soft outer border.
    // Availability blocks use a full dotted border (no accent bar) so they
    // visually read as a different *kind* of thing, not just a different status.
    return {
        style: getCalendarPaletteStyle({ bg: backgroundColor, border: borderColor, text: color, borderStyle }),
    };
};

/**
 * Get slot style based on availability
 */
export const calendarUIGetSlotProps = (
    date,
    availabilities,
    selectedTutors,
    currentWeekStart,
    currentWeekEnd,
) => {
    const filteredAvailabilities =
        selectedTutors.length > 0
            ? availabilities.filter((availability) =>
                  selectedTutors.some((tutor) => tutor.value === availability.tutor),
              )
            : availabilities;

    const availableTutors = filteredAvailabilities.filter((availability) => {
        const availStart = new Date(availability.start);
        const availEnd = new Date(availability.end);
        return date >= availStart && date < availEnd;
    }).length;

    const tutorsWithAvailabilitiesThisWeek = filteredAvailabilities
        .filter((availability) => {
            const availStart = new Date(availability.start);
            return availStart >= currentWeekStart && availStart < currentWeekEnd;
        })
        .map((availability) => availability.tutor);

    const uniqueTutorsThisWeek = [...new Set(tutorsWithAvailabilitiesThisWeek)];

    const maxTutors = uniqueTutorsThisWeek.length || 1; 
    // prevent division by zero

    if (availableTutors > 0) {
        const backgroundColor = calculateGreenIntensity(availableTutors, maxTutors);

        return {
            style: {
                backgroundColor,
            },
        };
    }

    return {};
};

/**
 * Calendar UI messages for react-big-calendar
 */
export const calendarUIMessages = {
    allDay: 'All day',
    previous: 'Back',
    next: 'Next',
    today: 'Today',
    month: 'Month',
    week: 'Week',
    day: 'Day',
    agenda: 'Agenda',
    date: 'Date',
    time: 'Time',
    event: 'Event',
    noEventsInRange: 'No events in this range.',
    showMore: (total) => `+${total} more`,
};
