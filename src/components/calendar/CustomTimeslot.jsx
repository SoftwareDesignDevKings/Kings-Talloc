import React, { useMemo } from 'react';
import { addMinutes } from 'date-fns';

/**
 * Compute a green background colour whose opacity reflects
 * how many tutors are available in this slot relative to the week.
 */
const computeAvailabilityHeatColor = (slotTutorCount, weeklyTutorCapacity) => {
    const opacity = Math.min(1, slotTutorCount / weeklyTutorCapacity);
    return `rgba(144, 238, 144, ${opacity})`;
};

const normaliseEmail = (email) => (typeof email === 'string' ? email.toLowerCase() : '');

export const getInitialsFromTutor = (name, email) => {
    const source = name || email;
    if (!source) return '';

    const localPart = source.includes('@') ? source.split('@')[0] : source;
    const parts = localPart
        .trim()
        .split(/[\s._-]+/)
        .filter(Boolean);

    if (parts.length > 1) {
        return parts.map(w => w[0]).join('').toUpperCase();
    }

    return localPart.substring(0, 2).toUpperCase();
};

const CustomTimeslot = ({
    children,
    slotStartValue,
    slotAvailabilities = [],
    slotTutors = [],
    slotTutorFilter = [],
    slotWeekStart,
    slotWeekEnd
}) => {

    const slotStartTime = useMemo(() => new Date(slotStartValue), [slotStartValue]);
    const slotEndTime = useMemo(() => addMinutes(slotStartTime, 30), [slotStartTime]);
    const tutorNameMap = useMemo(() => {
        const map = {};
        for (const t of slotTutors) {
            map[normaliseEmail(t.email)] = t.name;
        }
        return map;
    }, [slotTutors]);
    
    /* --------------------------------------------------------- */
    /* Filter availabilities by selected tutors                  */
    /* --------------------------------------------------------- */
    const availabilitiesRelevantToSlot = useMemo(() => {
        const filtered = [];

        if (slotTutorFilter.length > 0) {
            for (const availability of slotAvailabilities) {
                for (const tutor of slotTutorFilter) {
                    if (tutor.value === availability.tutor) {
                        filtered.push(availability);
                        break;
                    }
                }
            }
        } else {
            for (const availability of slotAvailabilities) {
                filtered.push(availability);
            }
        }

        return filtered;
    }, [slotAvailabilities, slotTutorFilter]);

    /* --------------------------------------------------------- */
    /* Tutors fully covering this 30-minute slot                 */
    /* --------------------------------------------------------- */
    const uniqueTutorInitialsForSlot = useMemo(() => {
        const tutorInitialsCoveringThisSlot = [];

        for (const availability of availabilitiesRelevantToSlot) {
            const availabilityStartTime = new Date(availability.start);
            const availabilityEndTime = new Date(availability.end);

            const fullyCoversSlot =
                availabilityStartTime <= slotStartTime &&
                availabilityEndTime >= slotEndTime;

            if (fullyCoversSlot) {
                const tutorEmail = availability.tutor;
                const name = tutorNameMap[normaliseEmail(tutorEmail)];
                tutorInitialsCoveringThisSlot.push(getInitialsFromTutor(name, tutorEmail));
            }
        }

        return Array.from(new Set(tutorInitialsCoveringThisSlot.filter(Boolean))).sort();
    }, [availabilitiesRelevantToSlot, slotStartTime, slotEndTime, tutorNameMap]);

    /* --------------------------------------------------------- */
    /* Weekly tutor capacity (for heat scaling)                  */
    /* --------------------------------------------------------- */
    const weeklyTutorCapacity = useMemo(() => {
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

        return uniqueTutorsAvailableThisWeek.length || 1;
    }, [availabilitiesRelevantToSlot, slotWeekStart, slotWeekEnd]);

    /* --------------------------------------------------------- */
    /* Slot background colour                                    */
    /* --------------------------------------------------------- */
    const slotBackgroundColor = useMemo(() => {
        if (uniqueTutorInitialsForSlot.length > 0) {
            return computeAvailabilityHeatColor(
                uniqueTutorInitialsForSlot.length,
                weeklyTutorCapacity,
            );
        }
        return 'transparent';
    }, [uniqueTutorInitialsForSlot, weeklyTutorCapacity]);

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
