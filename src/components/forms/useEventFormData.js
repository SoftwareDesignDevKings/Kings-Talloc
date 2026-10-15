import { isStudentSession, bookableIntervals, rangeCovered } from '@/lib/scheduling/eventRules';
import { useMemo } from 'react';
import { useAppData } from '@/contexts/AppDataContext';

/**
 * Derives event form options from data already loaded in AppDataProvider.
 * No Firestore reads — tutors, classes, students, and availabilities are
 * fetched/cached globally; this hook just reshapes them for the form selects.
 */
export const useEventFormData = (newEvent) => {
    const { tutors, classes, students, calendarAvailabilities, calendarShifts = [] } = useAppData();

    // Academic options use the same combined Work/availability coverage as bookings.
    // Teachers may still arrange sessions outside that coverage.
    const staffOptions = useMemo(() => {
        const eventStart = new Date(newEvent.start);
        const eventEnd = new Date(newEvent.end);
        const workType = newEvent.workType;

        let options = [];
        for (const tutor of tutors) {
            if (isStudentSession(newEvent) && !tutor.roles?.includes('tutor')) continue;
            if (workType === 'coaching' && !tutor.roles?.includes('coach')) continue;

            const coverage = workType === 'coaching' ? calendarAvailabilities.filter(a => a.tutor === tutor.email) : bookableIntervals(tutor.email, calendarAvailabilities, calendarShifts);
            const matchingAvailability = coverage.find(
                (avail) =>
                    avail.tutor === tutor.email &&
                    new Date(avail.start) <= eventStart &&
                    new Date(avail.end) >= eventEnd
            );

            options.push({
                value: tutor.email,
                label: tutor.name,
                roles: tutor.roles,
                locationType: rangeCovered(eventStart, eventEnd, coverage)
                    ? matchingAvailability?.locationType || coverage.find(a => a.start <= eventStart && a.end > eventStart)?.locationType || 'onsite'
                    : 'unavailable',
            });
        }
        return options;
    }, [tutors, calendarAvailabilities, calendarShifts, newEvent]);

    const classOptions = useMemo(() =>
        classes.map((cls) => ({
            value: cls.id,
            label: cls.courseCode ? `${cls.name} (${cls.courseCode})` : cls.name,
        })),
        [classes]
    );

    const studentOptions = useMemo(() =>
        students.map((student) => ({ value: student.email, label: student.name })),
        [students]
    );

    const isLoading = !tutors.length && !classes.length && !students.length;

    return { staffOptions, classOptions, studentOptions, isLoading };
};
