'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/firestore/firestoreClient';
import {
    getRequestNotificationPreference, REQUEST_ACK_STORAGE_PREFIX,
    timestampValue, compareTimestamps, latestRequestTimestamp, futurePendingRequests, countNewRequests,
} from '@/utils/requestNotifications';

const RequestNotificationsContext = createContext({ available: false, enabled: false });
export const useRequestNotifications = () => useContext(RequestNotificationsContext);

const isActive = () => document.visibilityState === 'visible' && document.hasFocus();
const asDate = value => value?.toDate ? value.toDate() : new Date(value);

const readAcknowledgement = (key) => {
    try {
        return timestampValue(JSON.parse(localStorage.getItem(key)));
    } catch {
        return null;
    }
};

// Mounted outside AppLayout so the listener survives page changes.
export const RequestNotificationsProvider = ({ email, profileId = email, availableRoles = [], children }) => {
    const recipient = email?.trim().toLowerCase();
    const notificationEligible = availableRoles.includes('teacher');
    return (notificationEligible || availableRoles.includes('admin')) && recipient
        ? <RequestSubscriptions key={recipient} email={recipient} profileId={profileId} notificationEligible={notificationEligible}>{children}</RequestSubscriptions>
        : children;
};

const RequestSubscriptions = ({ email, profileId, notificationEligible, children }) => {
    const pathname = usePathname();
    const storageKey = REQUEST_ACK_STORAGE_PREFIX + email;
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState(null);
    const [preferenceError, setPreferenceError] = useState(null);
    const [active, setActive] = useState(false);
    const [now, setNow] = useState(Date.now);
    const [acknowledgedAt, setAcknowledgedAt] = useState(null);
    const [subscriptionVersion, setSubscriptionVersion] = useState(0);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [preferenceReady, setPreferenceReady] = useState(false);
    const preference = useRef(null);
    const watermark = useRef(null);
    const currentSnapshot = useRef(null);
    const serverReady = useRef(false);

    const acknowledge = useCallback((timestamp) => {
        const stored = readAcknowledgement(storageKey);
        let latest = timestamp;
        for (const candidate of [stored, watermark.current]) {
            if (candidate && compareTimestamps(candidate, latest) > 0) latest = candidate;
        }
        watermark.current = latest;
        setAcknowledgedAt(latest);
        try {
            localStorage.setItem(storageKey, JSON.stringify(latest));
        } catch {
            // Notifications still work in memory if browser storage is unavailable.
        }
    }, [storageKey]);

    useEffect(() => {
        watermark.current = readAcknowledgement(storageKey);
        setAcknowledgedAt(watermark.current);
        setActive(isActive());

        const onActivity = () => {
            const foreground = isActive();
            setActive(foreground);
            setNow(Date.now());
            if (foreground && preference.current !== null && serverReady.current && currentSnapshot.current) {
                acknowledge(latestRequestTimestamp(currentSnapshot.current));
            }
        };
        const onStorage = (event) => {
            if (event.key !== storageKey) return;
            const incoming = readAcknowledgement(storageKey);
            if (incoming && (!watermark.current || compareTimestamps(incoming, watermark.current) > 0)) {
                watermark.current = incoming;
                setAcknowledgedAt(incoming);
            }
        };
        const onOffline = () => {
            preference.current = null;
            setPreferenceReady(false);
            serverReady.current = false;
            setReady(false);
            setError('Unable to refresh requests. Reconnect to continue.');
        };
        const onOnline = () => setSubscriptionVersion(value => value + 1);
        document.addEventListener('visibilitychange', onActivity);
        window.addEventListener('focus', onActivity);
        window.addEventListener('blur', onActivity);
        window.addEventListener('storage', onStorage);
        window.addEventListener('offline', onOffline);
        window.addEventListener('online', onOnline);
        return () => {
            document.removeEventListener('visibilitychange', onActivity);
            window.removeEventListener('focus', onActivity);
            window.removeEventListener('blur', onActivity);
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('offline', onOffline);
            window.removeEventListener('online', onOnline);
        };
    }, [storageKey, acknowledge]);

    useEffect(() => {
        preference.current = null;
        setPreferenceReady(false);
        setPreferenceError(null);
        return onSnapshot(doc(db, 'users', profileId), { includeMetadataChanges: true }, (snapshot) => {
            const fresh = !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites && navigator.onLine;
            // A missing/cached preference is unknown, not an opt-out: it must not consume unseen requests.
            if (!fresh) {
                preference.current = null;
                setPreferenceReady(false);
                setPreferenceError('Waiting for current notification settings. Check your connection.');
                return;
            }
            const enabled = notificationEligible && getRequestNotificationPreference(email, snapshot.data() || {});
            preference.current = enabled;
            setPreferenceReady(true);
            setNotificationsEnabled(enabled);
            setPreferenceError(null);
            if (serverReady.current && currentSnapshot.current && (!enabled || watermark.current === null || isActive())) {
                acknowledge(latestRequestTimestamp(currentSnapshot.current));
            }
        }, () => {
            preference.current = null;
            setPreferenceReady(false);
            setPreferenceError('Unable to refresh notification settings. Please retry.');
        });
    }, [email, profileId, notificationEligible, acknowledge, subscriptionVersion]);

    useEffect(() => {
        serverReady.current = false;
        setReady(false);
        const pendingQuery = query(collection(db, 'studentEventRequests'), where('approvalStatus', '==', 'pending'));
        return onSnapshot(pendingQuery, { includeMetadataChanges: true }, (snapshot) => {
            const fresh = !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites && navigator.onLine;
            // Keep the last server result during reconnects rather than replacing it with an incomplete cache.
            if (fresh || currentSnapshot.current === null) {
                const rows = snapshot.docs.map(doc => ({
                    ...doc.data(), id: doc.id, start: asDate(doc.data().start), end: asDate(doc.data().end),
                }));
                setRequests(rows);
                if (fresh) currentSnapshot.current = rows;
                setNow(Date.now());
                if (fresh && preference.current !== null && (watermark.current === null || !preference.current || isActive())) {
                    acknowledge(latestRequestTimestamp(rows));
                }
            }
            serverReady.current = fresh;
            setReady(fresh);
            setLoading(!fresh && currentSnapshot.current === null);
            setError(fresh ? null : 'Waiting for current requests. Check your connection.');
        }, () => {
            serverReady.current = false;
            setReady(false);
            setLoading(false);
            setError('Unable to refresh requests. Please retry.');
        });
    }, [acknowledge, subscriptionVersion]);

    const pendingRequests = useMemo(() => futurePendingRequests(requests, now), [requests, now]);
    const newCount = countNewRequests(pendingRequests.filter(request => request.start.getTime() > now), acknowledgedAt);

    useEffect(() => {
        const nextStart = Math.min(...pendingRequests.flatMap(request => [request.start.getTime(), request.start.getTime() + 900001]).filter(time => time > Date.now()));
        if (!Number.isFinite(nextStart)) return;
        const timer = setTimeout(() => setNow(Date.now()), Math.min(Math.max(1, nextStart - Date.now()), 2147483647));
        return () => clearTimeout(timer);
    }, [pendingRequests]);

    useEffect(() => {
        document.title = notificationEligible && notificationsEnabled && preferenceReady && !active && newCount > 0 ? `(${newCount}) Kings-Talloc` : 'Kings-Talloc';
        return () => { document.title = 'Kings-Talloc'; };
    }, [notificationEligible, notificationsEnabled, preferenceReady, active, newCount, pathname]);

    const retry = useCallback(() => setSubscriptionVersion(value => value + 1), []);
    const value = useMemo(() => ({
        available: true, enabled: notificationEligible && notificationsEnabled, pendingRequests, count: pendingRequests.length, loading, ready, error: error || preferenceError,
        hasData: currentSnapshot.current !== null, retry,
    }), [notificationEligible, notificationsEnabled, pendingRequests, loading, ready, error, preferenceError, retry]);

    return <RequestNotificationsContext.Provider value={value}>{children}</RequestNotificationsContext.Provider>;
};
