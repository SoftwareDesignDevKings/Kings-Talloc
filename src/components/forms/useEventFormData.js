import { useMemo } from 'react';
import { useAppData } from '@/contexts/AppDataContext';

/**
 * Derives event form options from data already loaded in AppDataProvider.
 * No Firestore reads — tutors, classes, students, and availabilities are
 * fetched/cached globally; this hook just reshapes them for the form selects.
 */
export const useEventFormData = (newEvent) => {
    const { tutors, classes, students, calendarAvailabilities } = useAppData();

    // For each tutor, check already-loaded availabilities to determine availability status
    const staffOptions = useMemo(() => {
        const eventStart = new Date(newEvent.start);
        const eventEnd = new Date(newEvent.end);

        return tutors.map((tutor) => {
            const matchingAvailability = calendarAvailabilities.find((avail) =>
                avail.tutor === tutor.email &&
                new Date(avail.start) <= eventStart &&
                new Date(avail.end) >= eventEnd
            );

            return {
                value: tutor.email,
                label: tutor.name,
                locationType: matchingAvailability
                    ? (matchingAvailability.locationType || 'onsite')
                    : 'unavailable',
            };
        });
    }, [tutors, calendarAvailabilities, newEvent.start, newEvent.end]);

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
