import { db } from '@/firestore/firestoreClient';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';

/**
 * Fetch dashboard data for teacher role
 * OPTIMIZED for Big-O complexity:
 * - Reduced parallel queries from 6 to 4
 * - Single-pass processing: O(n) instead of O(n*m)
 * - Pre-allocated Sets for O(1) lookups
 * - Eliminated redundant iterations
 */
export const fetchDashboardFirestoreDataTeacher = async (now = new Date()) => {
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
        // OPTIMIZATION 1: Reduced from 6 to 4 queries
        // Fetch weekly events once, derive today's and upcoming from it
        const [weeklyEventsSnapshot, pendingRequestsSnapshot, tutorsSnapshot, weeklyAvailabilitiesSnapshot] =
            await Promise.all([
                // Single query for all events this week (includes today + upcoming)
                getDocs(
                    query(
                        collection(db, 'events'),
                        where('start', '>=', Timestamp.fromDate(weekStart)),
                        where('start', '<', Timestamp.fromDate(weekEnd)),
                        orderBy('start', 'asc'),
                    ),
                ),
                // Only pending requests
                getDocs(
                    query(
                        collection(db, 'studentEventRequests'),
                        where('approvalStatus', '==', 'pending'),
                    ),
                ),
                // All tutors (cached by Firestore SDK)
                getDocs(query(collection(db, 'users'), where('role', '==', 'tutor'))),
                // Weekly availabilities
                getDocs(
                    query(
                        collection(db, 'tutorAvailabilities'),
                        where('start', '>=', Timestamp.fromDate(weekStart)),
                        where('start', '<', Timestamp.fromDate(weekEnd)),
                    ),
                ),
            ]);

        // OPTIMIZATION 2: Pre-allocate data structures for O(1) operations
        const activeTutorEmails = new Set(); // O(1) add/lookup
        const subjectCounts = new Map(); // O(1) add/lookup (faster than {})
        const todayEvents = [];
        const upcomingEvents = [];
        let totalBookedHours = 0;
        let completedEvents = 0;

        // OPTIMIZATION 3: Single-pass O(n) processing instead of multiple O(n) loops
        for (const doc of weeklyEventsSnapshot.docs) {
            const data = doc.data();
            const start = data.start.toDate();
            const end = data.end.toDate();

            // Classify event (today, upcoming, or past)
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
            if (isUpcomingEvent && upcomingEvents.length < 5) {
                upcomingEvents.push(event);
            }

            // Track active tutors - O(1) per staff member
            if (data.staff) {
                for (let i = 0; i < data.staff.length; i++) {
                    activeTutorEmails.add(data.staff[i].value);
                }
            }

            // Subject distribution - O(1) per event
            if (data.subject) {
                const subjectName =
                    typeof data.subject === 'string'
                        ? data.subject
                        : data.subject.label || data.subject.value || 'Unknown';
                subjectCounts.set(subjectName, (subjectCounts.get(subjectName) || 0) + 1);
            }

            // Booked hours - O(1)
            totalBookedHours += (end - start) / 3600000; // milliseconds to hours

            // Completed count - O(1)
            if (data.workStatus === 'completed' && end < now) {
                completedEvents++;
            }
        }

        // OPTIMIZATION 4: Top subjects - Map.entries() is faster than Object.entries()
        const subjectArray = [];
        for (const [name, count] of subjectCounts.entries()) {
            subjectArray.push({ name, count });
        }
        subjectArray.sort((a, b) => b.count - a.count);
        const topSubjects = subjectArray.slice(0, 3);

        // OPTIMIZATION 5: Process pending requests - single pass O(n)
        const pendingRequests = [];
        for (const doc of pendingRequestsSnapshot.docs) {
            const data = doc.data();
            pendingRequests.push({
                id: doc.id,
                ...data,
                start: data.start.toDate(),
                end: data.end.toDate(),
            });
        }

        // OPTIMIZATION 6: Available hours - single pass O(n)
        let totalAvailableHours = 0;
        for (const doc of weeklyAvailabilitiesSnapshot.docs) {
            const data = doc.data();
            const start = data.start.toDate();
            const end = data.end.toDate();
            totalAvailableHours += (end - start) / 3600000;
        }

        const weeklyUtilization =
            totalAvailableHours > 0 ? Math.round((totalBookedHours / totalAvailableHours) * 100) : 0;

        return {
            todayEvents,
            upcomingEvents,
            upcomingEventsCount: upcomingEvents.length,
            completedEvents,
            unapprovedStudentRequests: pendingRequests.length,
            pendingRequestsData: pendingRequests,
            activeTutors: activeTutorEmails.size,
            totalTutors: tutorsSnapshot.size,
            weeklyUtilization,
            topSubjects,
        };
    } catch (error) {
        console.error('Error fetching teacher dashboard data:', error);
        return {
            todayEvents: [],
            upcomingEvents: [],
            upcomingEventsCount: 0,
            completedEvents: 0,
            unapprovedStudentRequests: 0,
            pendingRequestsData: [],
            activeTutors: 0,
            totalTutors: 0,
            weeklyUtilization: 0,
            topSubjects: [],
        };
    }
};

/**
 * REQUIRED FIRESTORE COMPOSITE INDEXES:
 *
 * Collection: events
 * - Fields: start (Ascending), __name__ (Ascending)
 *
 * Collection: tutorAvailabilities
 * - Fields: start (Ascending), __name__ (Ascending)
 *
 * Collection: studentEventRequests
 * - Fields: approvalStatus (Ascending), __name__ (Ascending)
 */
