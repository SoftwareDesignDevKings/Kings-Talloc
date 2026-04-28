import { db } from '@/firestore/firestoreClient';
import { collection, getDocs, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { CalendarEntityType } from '@lib/patterns/calendarStrategy';

// ---------------------------------------------------------------------------
// Module-level cache for rarely-changing reference data (tutors, subjects, etc.)
// Survives re-renders and re-mounts for the lifetime of the browser session.
// ---------------------------------------------------------------------------
const STATIC_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const staticCache = new Map(); 
// key → { data, fetchedAt }

const getCachedOrFetch = async (key, fetchFn) => {
    const entry = staticCache.get(key);
    if (entry && Date.now() - entry.fetchedAt < STATIC_CACHE_TTL_MS) {
        return entry.data;
    }
    const data = await fetchFn();
    staticCache.set(key, { data, fetchedAt: Date.now() });
    return data;
};

const deserializeShift = (doc) => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        start: data.start.toDate(),
        end: data.end.toDate(),
        ...(data.until && { until: data.until.toDate() }),
        entityType: CalendarEntityType.SHIFT,
    };
};

const buildAccessFilters = (strategyFbFilters) =>
    strategyFbFilters.map(({ fbField, fbOperation, fbValue }) =>
        where(fbField, fbOperation, fbValue)
    );

/**
 * One-off shifts within the viewed date range.
 * Re-subscribes on every week navigation.
 */
export const firestoreFetchOneOffShifts = (setOneOffShifts, calendarDateRange, strategyFbFilters) => {
    if (strategyFbFilters === null) {
        setOneOffShifts([]);
        return () => {};
    }

    const q = query(
        collection(db, 'shifts'),
        where('start', '>=', Timestamp.fromDate(calendarDateRange.start)),
        where('start', '<=', Timestamp.fromDate(calendarDateRange.end)),
        where('recurring', '==', null),
        ...buildAccessFilters(strategyFbFilters)
    );

    return onSnapshot(q,
        (snapshot) => setOneOffShifts(snapshot.docs.map(deserializeShift)),
        (error) => { console.error('Firestore Shifts (one-off) Error:', error); setOneOffShifts([]); }
    );
};

/**
 * Active recurring base shifts only — excludes expired series.
 * Two listeners are needed because Firestore can't OR across different field predicates:
 *   1. Open-ended series  (until == null — no end date set)
 *   2. Still-active series (until >= now — haven't expired yet)
 * Results are merged before being set, so the provider sees a single array.
 * Requires a composite index on shifts: (recurring ASC, until ASC).
 */
export const firestoreFetchRecurringShifts = (setRecurringBaseShifts, strategyFbFilters) => {
    if (strategyFbFilters === null) {
        setRecurringBaseShifts([]);
        return () => {};
    }

    const now = Timestamp.now();
    const accessFilters = buildAccessFilters(strategyFbFilters);

    // Open-ended recurring shifts (no until date)
    const openEndedQuery = query(
        collection(db, 'shifts'),
        where('recurring', 'in', ['weekly', 'fortnightly']),
        where('until', '==', null),
        ...accessFilters
    );

    // Still-active recurring shifts (until date is in the future)
    const activeQuery = query(
        collection(db, 'shifts'),
        where('recurring', 'in', ['weekly', 'fortnightly']),
        where('until', '>=', now),
        ...accessFilters
    );

    let openEndedShifts = [];
    let activeShifts = [];

    const merge = () => setRecurringBaseShifts([...openEndedShifts, ...activeShifts]);

    const unsubOpenEnded = onSnapshot(
        openEndedQuery,
        (snapshot) => { openEndedShifts = snapshot.docs.map(deserializeShift); merge(); },
        (error) => console.error('Firestore Recurring Shifts (open-ended) Error:', error)
    );

    const unsubActive = onSnapshot(
        activeQuery,
        (snapshot) => { activeShifts = snapshot.docs.map(deserializeShift); merge(); },
        (error) => console.error('Firestore Recurring Shifts (active) Error:', error)
    );

    return () => { unsubOpenEnded(); unsubActive(); };
};

/**
 * Optimized Availabilities Fetching
 */
export const firestoreFetchAvailabilities = (setCalendarAvailabilities, calendarDateRange, strategyFbFilters) => {
    if (strategyFbFilters === null) {
        setCalendarAvailabilities([]);
        return () => {};
    }

    const availabilitiesRef = collection(db, 'tutorAvailabilities');
    const q = query(
        availabilitiesRef,
        where('start', '>=', Timestamp.fromDate(calendarDateRange.start)),
        where('start', '<=', Timestamp.fromDate(calendarDateRange.end)),
        ...strategyFbFilters.map(({ fbField, fbOperation, fbValue }) => where(fbField, fbOperation, fbValue))
    );

    return onSnapshot(q, (snapshot) => {
        const availabilities = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                start: data.start.toDate(),
                end: data.end.toDate(),
                entityType: CalendarEntityType.AVAILABILITY,
            };
        });
        setCalendarAvailabilities(availabilities);
    }, (error) => {
        console.error("Firestore Availabilities Error:", error);
        setCalendarAvailabilities([]);
    });
};

/**
 * Optimized Student Requests Fetching
 */
export const firestoreFetchStudentRequests = (setCalendarStudentRequests, calendarDateRange, strategyFbFilters) => {
    if (strategyFbFilters === null) {
        setCalendarStudentRequests([]);
        return () => {};
    }

    const requestsRef = collection(db, 'studentEventRequests');
    const q = query(
        requestsRef,
        where('start', '>=', Timestamp.fromDate(calendarDateRange.start)),
        where('start', '<=', Timestamp.fromDate(calendarDateRange.end)),
        ...strategyFbFilters.map(({ fbField, fbOperation, fbValue }) => where(fbField, fbOperation, fbValue))
    );

    return onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                start: data.start.toDate(),
                end: data.end.toDate(),
                entityType: CalendarEntityType.STUDENT_REQUEST,
            };
        });
        setCalendarStudentRequests(requests);
    }, (error) => {
        console.error("Firestore Requests Error:", error);
        setCalendarStudentRequests([]);
    });
};

export const fetchCacheTutors = () =>
    getCachedOrFetch('tutors', async () => {
        const [roleSnapshot, defaultRoleSnapshot, userRolesSnapshot] = await Promise.all([
            getDocs(query(collection(db, 'users'), where('role', 'in', ['tutor', 'coach']))),
            getDocs(query(collection(db, 'users'), where('defaultRole', 'in', ['tutor', 'coach']))),
            getDocs(query(collection(db, 'users'), where('userRoles', 'array-contains-any', ['tutor', 'coach']))),
        ]);

        const usersMap = new Map();
        [...roleSnapshot.docs, ...defaultRoleSnapshot.docs, ...userRolesSnapshot.docs].forEach((doc) => {
            const { email, name, defaultRole, role } = doc.data();
            if (!usersMap.has(email)) {
                usersMap.set(email, { name, primaryRole: defaultRole || role });
            }
        });

        return [...usersMap.entries()].map(([email, { name, primaryRole }]) => ({ email, name, primaryRole }));
    });

export const fetchCacheSubjects = () =>
    getCachedOrFetch('subjects', async () => {
        const snapshot = await getDocs(collection(db, 'subjects'));
        return snapshot.docs.map((doc) => {
            const data = doc.data();
            return { id: doc.id, name: data.name, tutors: data.tutors || [] };
        });
    });

export const fetchCacheClasses = () =>
    getCachedOrFetch('classes', async () => {
        const snapshot = await getDocs(collection(db, 'classes'));
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    });

export const fetchCacheStudents = () =>
    getCachedOrFetch('students', async () => {
        const snapshot = await getDocs(collection(db, 'students'));
        return snapshot.docs.map((doc) => {
            const { email, name } = doc.data();
            return { email, name: name || email };
        });
    });