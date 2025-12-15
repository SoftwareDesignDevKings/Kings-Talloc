import { db } from '@/firestore/firestoreClient';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';

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
        // OPTIMIZATION 1: Reduced from 5 to 3 queries
        // Fetch weekly events once, derive today's, upcoming, completed, and incomplete from it
        const [weeklyEventsSnapshot, upcomingEventsSnapshot, confirmationEventsSnapshot] =
            await Promise.all([
                // Single query for all events this week (includes today + stats)
                getDocs(
                    query(
                        collection(db, 'shifts'),
                        where('staff', 'array-contains', { value: userEmail, label: userEmail }),
                        where('start', '>=', Timestamp.fromDate(weekStart)),
                        where('start', '<', Timestamp.fromDate(weekEnd)),
                    ),
                ),
                // Upcoming events beyond this week (limit 5)
                getDocs(
                    query(
                        collection(db, 'shifts'),
                        where('staff', 'array-contains', { value: userEmail, label: userEmail }),
                        where('start', '>=', Timestamp.fromDate(weekEnd)),
                        orderBy('start', 'asc'),
                        limit(5),
                    ),
                ),
                // Events requiring confirmation
                getDocs(
                    query(
                        collection(db, 'shifts'),
                        where('staff', 'array-contains', { value: userEmail, label: userEmail }),
                        where('confirmationRequired', '==', true),
                    ),
                ),
            ]);

        // OPTIMIZATION 2: Pre-allocate data structures for O(1) operations
        const uniqueStudentEmails = new Set(); // O(1) add/lookup
        const todayEvents = [];
        const thisWeekUpcoming = [];
        let tutoringHours = 0;
        let coachingHours = 0;
        let needsCompletion = 0;
        let completedEvents = 0;

        // OPTIMIZATION 3: Single-pass O(n) processing instead of multiple O(n) loops
        for (const doc of weeklyEventsSnapshot.docs) {
            const data = doc.data();
            const start = data.start.toDate();
            const end = data.end.toDate();
            const hours = (end - start) / 3600000; // milliseconds to hours

            // Classify event (today, upcoming, completed)
            const isTodayEvent = start >= startOfToday && start <= endOfToday;
            const isUpcomingEvent = start > now;

            // Build event object once
            const event = {
                id: doc.id,
                ...data,
                start,
                end,
            };

            // Categorize events
            if (isTodayEvent) {
                todayEvents.push(event);
            }
            if (isUpcomingEvent && thisWeekUpcoming.length < 5) {
                thisWeekUpcoming.push(event);
            }

            // Track unique students - O(1) per student
            if (data.students) {
                for (let i = 0; i < data.students.length; i++) {
                    uniqueStudentEmails.add(data.students[i].value);
                }
            }

            // Hours calculation & completion tracking - O(1)
            if (data.workStatus === 'completed') {
                completedEvents++;
                if (data.workType === 'coaching') {
                    coachingHours += hours;
                } else {
                    tutoringHours += hours;
                }
            } else if (end < now) {
                // Event is past but not completed
                needsCompletion++;
            }
        }

        // OPTIMIZATION 4: Process upcoming events - combine this week + beyond
        const upcomingEvents = [];
        for (let i = 0; i < thisWeekUpcoming.length && upcomingEvents.length < 5; i++) {
            upcomingEvents.push(thisWeekUpcoming[i]);
        }
        for (const doc of upcomingEventsSnapshot.docs) {
            if (upcomingEvents.length >= 5) break;
            const data = doc.data();
            upcomingEvents.push({
                id: doc.id,
                ...data,
                start: data.start.toDate(),
                end: data.end.toDate(),
            });
        }

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
