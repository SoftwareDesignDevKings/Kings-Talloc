import { db } from '@/firestore/firestoreClient';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { DateTime } from 'luxon';
import { SYDNEY_ZONE } from '@/lib/scheduling/eventRules';
import { recordSnapshotReads } from '@/lib/telemetry/clientReads';
import { CalendarEntityType } from '@lib/patterns/calendarStrategy';

// ---------------------------------------------------------------------------
// Module-level cache for rarely-changing reference data (tutors, subjects, etc.)
// Survives re-renders and re-mounts for the lifetime of the browser session.
// ---------------------------------------------------------------------------
const STATIC_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const staticCache = new Map(); 
// key → { data, fetchedAt }

// Callers share one in-flight read, so concurrent cold loads (e.g. the app data and
// the teacher dashboard) don't each read the collection. Failed reads are not kept.
const getCachedOrFetch = (key, fetchFn) => {
    const entry = staticCache.get(key);
    if (entry && Date.now() - entry.fetchedAt < STATIC_CACHE_TTL_MS) {
        return entry.promise;
    }
    const promise = fetchFn();
    staticCache.set(key, { promise, fetchedAt: Date.now() });
    promise.catch(() => { if (staticCache.get(key)?.promise === promise) staticCache.delete(key); });
    return promise;
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
        isStudentRequest: false,
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
        (snapshot) => { recordSnapshotReads('shifts:one-off', snapshot); setOneOffShifts(snapshot.docs.map(deserializeShift)); },
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

    // Start of today rather than now: the query stays identical all day, so a
    // re-subscription can resume from the local cache instead of re-reading.
    const now = Timestamp.fromDate(DateTime.now().setZone(SYDNEY_ZONE).startOf('day').toJSDate());
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
        (snapshot) => { recordSnapshotReads('shifts:recurring-open', snapshot); openEndedShifts = snapshot.docs.map(deserializeShift); merge(); },
        (error) => console.error('Firestore Recurring Shifts (open-ended) Error:', error)
    );

    const unsubActive = onSnapshot(
        activeQuery,
        (snapshot) => { recordSnapshotReads('shifts:recurring-active', snapshot); activeShifts = snapshot.docs.map(deserializeShift); merge(); },
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
        ...buildAccessFilters(strategyFbFilters)
    );

    return onSnapshot(q, (snapshot) => {
        recordSnapshotReads('tutorAvailabilities', snapshot);
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
        ...buildAccessFilters(strategyFbFilters)
    );

    return onSnapshot(q, (snapshot) => {
        recordSnapshotReads('studentEventRequests', snapshot);
        const requests = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                start: data.start.toDate(),
                end: data.end.toDate(),
                entityType: CalendarEntityType.STUDENT_REQUEST,
                isStudentRequest: true,
            };
        });
        setCalendarStudentRequests(requests);
    }, (error) => {
        console.error("Firestore Requests Error:", error);
        setCalendarStudentRequests([]);
    });
};

// Reference data comes from server routes backed by the shared Redis cache, so
// staff tabs no longer each read whole users and Canvas collections.
const fetchReference = async (path, field) => {
    const response = await fetch(path, { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `Unable to load ${field}.`);
    return data[field];
};

export const fetchCacheTutors = () =>
    getCachedOrFetch('tutors', () => fetchReference('/api/reference/tutors', 'tutors'));

export const fetchCacheSubjects = () =>
    getCachedOrFetch('subjects', async () => []);

export const fetchCacheClasses = () =>
    getCachedOrFetch('classes', () => fetchReference('/api/reference/classes', 'classes'));

export const fetchStudentTutorEligibility = async (studentEmail) => {
    if (!studentEmail) {
        return { coverageKeys: [], eligibleTutorEmails: [], eligibleTutors: [] };
    }
    return fetchReference('/api/reference/eligibility', 'eligibility');
};
