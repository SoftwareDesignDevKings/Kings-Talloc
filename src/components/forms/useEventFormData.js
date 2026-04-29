import { useMemo } from 'react';
import { useAppData } from '@/contexts/AppDataContext';

/**
 * Derives event form options from data already loaded in AppDataProvider.
 * No Firestore reads — tutors, classes, students, and availabilities are
 * fetched/cached globally; this hook just reshapes them for the form selects.
 */
export const useEventFormData = (newEvent) => {
    const { tutors, classes, students, calendarAvailabilities } = useAppData();

    // For each tutor, check already-loaded availabilities to determine availability status.
    // When workType is 'tutoring' or 'coaching', only show staff whose roles match.
    const staffOptions = useMemo(() => {
        const eventStart = new Date(newEvent.start);
        const eventEnd = new Date(newEvent.end);
        const workType = newEvent.workType;

        let options = [];
        for (const tutor of tutors) {
            if (workType === 'tutoring' && !tutor.roles?.includes('tutor')) continue;
            if (workType === 'coaching' && !tutor.roles?.includes('coach')) continue;

            const matchingAvailability = calendarAvailabilities.find(
                (avail) =>
                    avail.tutor === tutor.email &&
                    new Date(avail.start) <= eventStart &&
                    new Date(avail.end) >= eventEnd
            );

            options.push({
                value: tutor.email,
                label: tutor.name,
                roles: tutor.roles,
                locationType: matchingAvailability
                    ? matchingAvailability.locationType || 'onsite'
                    : 'unavailable',
            });
        }
        return options;
    }, [tutors, calendarAvailabilities, newEvent.start, newEvent.end, newEvent.workType]);

    const classOptions = useMemo(() =>
        classes.map((cls) => ({ value: cls.id, label: cls.name })),
        [classes]
    );

    const studentOptions = useMemo(() =>
        students.map((student) => ({ value: student.email, label: student.name })),
        [students]
    );

    const isLoading = !tutors.length && !classes.length && !students.length;

    return { staffOptions, classOptions, studentOptions, isLoading };
};
