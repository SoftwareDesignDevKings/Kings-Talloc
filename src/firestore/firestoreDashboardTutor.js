import { db } from '@/firestore/firestoreClient';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { recurringCalendarExpand } from '@/utils/calendarRecurringEvents';
import { addWeeks } from 'date-fns';

/**
 * Fetch dashboard data for tutor role
 * OPTIMIZED for Big-O complexity:
 * - Reduced parallel queries from 5 to 3
 * - Single-pass processing: O(n) instead of O(n*m)
 * - Pre-allocated Sets for O(1) lookups
 * - Eliminated redundant iterations
 */
export const fetchDashboardFirestoreDataTutor = async (userEmail, now = new Date()) => {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    // Week boundaries
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    try {
        // OPTIMIZATION 1: Separate queries for non-recurring and recurring events
        const [nonRecurringEventsSnapshot, recurringEventsSnapshot, confirmationEventsSnapshot] =
            await Promise.all([
                // Non-recurring events for this tutor (this week onwards)
                getDocs(
                    query(
                        collection(db, 'shifts'),
                        where('emailsList', 'array-contains', userEmail),
                        where('start', '>=', Timestamp.fromDate(weekStart)),
                        where('recurring', '==', null),
                    ),
                ),
                // ALL recurring events for this tutor
                getDocs(
                    query(
                        collection(db, 'shifts'),
                        where('emailsList', 'array-contains', userEmail),
                        where('recurring', 'in', ['weekly', 'fortnightly']),
                    ),
                ),
                // Events requiring confirmation
                getDocs(
                    query(
                        collection(db, 'shifts'),
                        where('emailsList', 'array-contains', userEmail),
                        where('confirmationRequired', '==', true),
                    ),
                ),
            ]);

        // OPTIMIZATION 2: Process non-recurring events
        let allEvents = nonRecurringEventsSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                start: data.start.toDate(),
                end: data.end.toDate(),
            };
        });

        // Process recurring events
        let recurringEvents = recurringEventsSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                start: data.start.toDate(),
                end: data.end.toDate(),
                ...(data.until && { until: data.until.toDate() }),
            };
        });

        // Expand recurring events (this week onwards)
        recurringEvents = recurringCalendarExpand(recurringEvents, {
            rangeStart: weekStart,
            rangeEnd: addWeeks(weekEnd, 52),
            maxOccurrences: 52,
        }).filter(event => event.start >= weekStart);

        // Combine all events
        allEvents = [...allEvents, ...recurringEvents];

        // Filter for this week's events
        const weeklyEvents = allEvents.filter(event => {
            return event.start >= weekStart && event.start < weekEnd;
        });

        // OPTIMIZATION 3: Pre-allocate data structures for O(1) operations
        const uniqueStudentEmails = new Set(); // O(1) add/lookup
        const todayEvents = [];
        let tutoringHours = 0;
        let coachingHours = 0;
        let needsCompletion = 0;
        let completedEvents = 0;

        // OPTIMIZATION 4: Single-pass O(n) processing instead of multiple O(n) loops
        for (const event of weeklyEvents) {
            const start = event.start;
            const end = event.end;
            const hours = (end - start) / 3600000; // milliseconds to hours

            // Classify event (today, upcoming, completed)
            const isTodayEvent = start >= startOfToday && start <= endOfToday;

            // Categorize events
            if (isTodayEvent) {
                todayEvents.push(event);
            }

            // Track unique students - O(1) per student
            if (event.students) {
                for (let i = 0; i < event.students.length; i++) {
                    uniqueStudentEmails.add(event.students[i].value);
                }
            }

            // Hours calculation & completion tracking - O(1)
            if (event.workStatus === 'completed') {
                completedEvents++;
                if (event.workType === 'coaching') {
                    coachingHours += hours;
                } else {
                    tutoringHours += hours;
                }
            } else if (end < now) {
                // Event is past but not completed
                needsCompletion++;
            }
        }

        // OPTIMIZATION 5: Process upcoming events from already-expanded allEvents
        const upcomingEvents = allEvents
            .filter(event => event.start > now)
            .slice(0, 5);

        // OPTIMIZATION 5: Confirmation processing - single pass O(n)
        let needsConfirmation = 0;
        for (const doc of confirmationEventsSnapshot.docs) {
            const data = doc.data();
            const hasResponse = data.tutorResponses?.some(
                (resp) => resp.email === userEmail && resp.response,
            );
            if (!hasResponse) {
                needsConfirmation++;
            }
        }

        return {
            todayEvents,
            upcomingEvents,
            upcomingEventsCount: upcomingEvents.length,
            completedEvents,
            weeklyHours: {
                tutoring: Math.round(tutoringHours * 10) / 10,
                coaching: Math.round(coachingHours * 10) / 10,
            },
            needsCompletion,
            needsConfirmation,
            uniqueStudents: uniqueStudentEmails.size,
        };
    } catch (error) {
        console.error('Error fetching tutor dashboard data:', error);
        return {
            todayEvents: [],
            upcomingEvents: [],
            upcomingEventsCount: 0,
            completedEvents: 0,
            weeklyHours: { tutoring: 0, coaching: 0 },
            needsCompletion: 0,
            needsConfirmation: 0,
            uniqueStudents: 0,
        };
    }
};

/**
 * REQUIRED FIRESTORE COMPOSITE INDEXES:
 *
 * Collection: events
 * - Fields: staff (Array), start (Ascending), __name__ (Ascending)
 * - Fields: staff (Array), confirmationRequired (Ascending), __name__ (Ascending)
 */
