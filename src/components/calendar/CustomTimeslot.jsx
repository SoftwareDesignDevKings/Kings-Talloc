import React from 'react';
import { addMinutes } from 'date-fns';

/**
 * Compute a green background colour whose opacity reflects
 * how many tutors are available in this slot relative to the week.
 */
const computeAvailabilityHeatColor = (slotTutorCount, weeklyTutorCapacity) => {
    const opacity = Math.min(1, slotTutorCount / weeklyTutorCapacity);
    return `rgba(144, 238, 144, ${opacity})`;
};

const CustomTimeslot = ({
    children,
    slotStartValue,
    slotAvailabilities = [],
    slotTutorFilter = [], 
    slotWeekStart,
    slotWeekEnd,
}) => {
    const slotStartTime = new Date(slotStartValue);
    const slotEndTime = addMinutes(slotStartTime, 30);

    /* --------------------------------------------------------- */
    /* Filter availabilities by selected tutors                  */
    /* --------------------------------------------------------- */
    const availabilitiesRelevantToSlot = [];

    if (slotTutorFilter.length > 0) {
        for (const availability of slotAvailabilities) {
            for (const tutor of slotTutorFilter) {
                if (tutor.value === availability.tutor) {
                    availabilitiesRelevantToSlot.push(availability);
                    break;
                }
            }
        }
    } else {
        for (const availability of slotAvailabilities) {
            availabilitiesRelevantToSlot.push(availability);
        }
    }

    /* --------------------------------------------------------- */
    /* Tutors fully covering this 30-minute slot                 */
    /* --------------------------------------------------------- */
    const tutorInitialsCoveringThisSlot = [];

    for (const availability of availabilitiesRelevantToSlot) {
        const availabilityStartTime = new Date(availability.start);
        const availabilityEndTime = new Date(availability.end);

        const fullyCoversSlot =
            availabilityStartTime <= slotStartTime &&
            availabilityEndTime >= slotEndTime;

        if (fullyCoversSlot) {
            tutorInitialsCoveringThisSlot.push(
                availability.tutor.substring(0, 2).toUpperCase(),
            );
        }
    }

    const uniqueTutorInitialsForSlot =
        Array.from(new Set(tutorInitialsCoveringThisSlot)).sort();

    /* --------------------------------------------------------- */
    /* Weekly tutor capacity (for heat scaling)                  */
    /* --------------------------------------------------------- */
    const tutorsAvailableAtAnyTimeThisWeek = [];

    for (const availability of availabilitiesRelevantToSlot) {
        const availabilityStartTime = new Date(availability.start);

        if (
            availabilityStartTime >= slotWeekStart &&
            availabilityStartTime < slotWeekEnd
        ) {
            tutorsAvailableAtAnyTimeThisWeek.push(availability.tutor);
        }
    }

    const uniqueTutorsAvailableThisWeek = Array.from(
        new Set(tutorsAvailableAtAnyTimeThisWeek),
    );

    const weeklyTutorCapacity =
        uniqueTutorsAvailableThisWeek.length || 1;

    /* --------------------------------------------------------- */
    /* Slot background colour                                    */
    /* --------------------------------------------------------- */
    let slotBackgroundColor = 'transparent';

    if (uniqueTutorInitialsForSlot.length > 0) {
        slotBackgroundColor = computeAvailabilityHeatColor(
            uniqueTutorInitialsForSlot.length,
            weeklyTutorCapacity,
        );
    }

    /* --------------------------------------------------------- */
    /* Render                                                    */
    /* --------------------------------------------------------- */
    return (
        <div
            className="custom-time-slot-wrapper"
            style={{ '--custom-slot-bg': slotBackgroundColor }}
        >
            {children}

            <div className="custom-slot-text">
                <div className="text-line">
                    {uniqueTutorInitialsForSlot.join(' ')}
                </div>
            </div>
        </div>
    );
};

export default CustomTimeslot;
