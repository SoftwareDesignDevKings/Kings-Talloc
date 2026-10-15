import React from 'react';
import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import { doc, onSnapshot } from 'firebase/firestore';
import { RequestNotificationsProvider, useRequestNotifications } from '@/contexts/RequestNotificationsContext';
import { REQUEST_ACK_STORAGE_PREFIX } from '@/utils/requestNotifications';

const storageKey = REQUEST_ACK_STORAGE_PREFIX + 'mienna@kings.edu.au';
const timestamp = (seconds, nanoseconds = 0) => ({ seconds, nanoseconds });
const request = (id, createdAt, start = new Date('2026-11-10T04:00:00Z')) => ({
    id, createdAt, start, end: new Date(start.getTime() + 3600000), approvalStatus: 'pending',
});
const Probe = () => {
    const state = useRequestNotifications();
    return <><output data-testid="state">{JSON.stringify(state)}</output><button onClick={state.retry}>Retry</button></>;
};

describe('request notifications', () => {
    let focused;
    let visible;
    let receive;
    let fail;
    let unsubscribe;
    let receivePreference;
    let failPreference;
    let preferenceData;
    let initialPreferenceMetadata;
    const mount = (props = {}) => render(<RequestNotificationsProvider email="mienna@kings.edu.au" availableRoles={['teacher', 'admin']} {...props}><Probe /></RequestNotificationsProvider>);
    const state = () => JSON.parse(screen.getByTestId('state').textContent);
    const snapshot = (requests, metadata = {}) => act(() => receive({
        docs: requests.map(row => ({ id: row.id, data: () => row })),
        metadata: { fromCache: false, hasPendingWrites: false, ...metadata },
    }));
    const focus = (value) => act(() => {
        focused = value;
        window.dispatchEvent(new Event(value ? 'focus' : 'blur'));
    });
    const preferenceSnapshot = (data, metadata = {}) => act(() => receivePreference({
        data: () => data, metadata: { fromCache: false, hasPendingWrites: false, ...metadata },
    }));

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-10-14T00:00:00Z'));
        localStorage.clear();
        focused = true;
        visible = true;
        preferenceData = {};
        initialPreferenceMetadata = {};
        jest.spyOn(document, 'hasFocus').mockImplementation(() => focused);
        jest.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visible ? 'visible' : 'hidden');
        unsubscribe = jest.fn();
        doc.mockImplementation((_db, collectionName) => ({ collectionName }));
        onSnapshot.mockImplementation((_query, _options, callback, error) => {
            if (_query?.collectionName === 'users') {
                receivePreference = callback;
                failPreference = error;
                receivePreference({ data: () => preferenceData, metadata: { fromCache: false, hasPendingWrites: false, ...initialPreferenceMetadata } });
                return jest.fn();
            }
            receive = callback;
            fail = error;
            return unsubscribe;
        });
    });
    afterEach(() => {
        cleanup();
        jest.restoreAllMocks();
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    test('two existing plus three new requests: acknowledge on return without resolving requests', () => {
        mount();
        const existing = [request('old-a', timestamp(100)), request('old-b', timestamp(101))];
        snapshot(existing);
        expect(state().count).toBe(2);
        focus(false);
        const all = [...existing, request('new-a', timestamp(102)), request('new-b', timestamp(103)), request('new-c', timestamp(104))];
        snapshot(all);
        expect(document.title).toBe('(3) Kings-Talloc');
        expect(state().count).toBe(5);
        focus(true);
        expect(document.title).toBe('Kings-Talloc');
        expect(state().count).toBe(5);
        snapshot(all.slice(1));
        expect(state().count).toBe(4);
        focus(false);
        expect(document.title).toBe('Kings-Talloc');
    });

    test('foreground arrivals and edits do not raise notifications; denied and deleted rows disappear', () => {
        mount();
        snapshot([]);
        const row = request('new', timestamp(100));
        snapshot([row]);
        focus(false);
        expect(document.title).toBe('Kings-Talloc');
        snapshot([{ ...row, title: 'Edited' }]);
        expect(document.title).toBe('Kings-Talloc');
        snapshot([row, request('away', timestamp(101))]);
        expect(document.title).toBe('(1) Kings-Talloc');
        snapshot([row]);
        expect(document.title).toBe('Kings-Talloc');
        snapshot([{ ...row, approvalStatus: 'denied' }]);
        expect(state().count).toBe(0);
    });

    test('legacy requests count, distant requests are sorted, and past requests never count', () => {
        mount();
        snapshot([
            request('distant', timestamp(103), new Date('2027-01-01T00:00:00Z')),
            request('legacy', undefined),
            request('past', timestamp(101), new Date('2026-10-13T00:00:00Z')),
        ]);
        expect(state().pendingRequests.map(row => row.id)).toEqual(['legacy', 'distant']);
        focus(false);
        expect(document.title).toBe('Kings-Talloc');
    });

    test('session start clears title but retains approval until the grace deadline', () => {
        mount();
        snapshot([]);
        focus(false);
        snapshot([request('soon', timestamp(100), new Date(Date.now() + 1000))]);
        expect(document.title).toBe('(1) Kings-Talloc');
        act(() => jest.advanceTimersByTime(1000));
        expect(state().count).toBe(1);
        expect(document.title).toBe('Kings-Talloc');
        act(() => jest.advanceTimersByTime(900001));
        expect(state().count).toBe(0);
    });

    test('hidden foreground window is away, and returning recomputes expired sessions', () => {
        mount();
        snapshot([]);
        act(() => {
            visible = false;
            document.dispatchEvent(new Event('visibilitychange'));
        });
        snapshot([request('soon', timestamp(100), new Date(Date.now() + 1000))]);
        expect(document.title).toBe('(1) Kings-Talloc');
        act(() => {
            jest.setSystemTime(Date.now() + 902000);
            visible = true;
            document.dispatchEvent(new Event('visibilitychange'));
        });
        expect(state().count).toBe(0);
        expect(document.title).toBe('Kings-Talloc');
    });

    test('refresh preserves acknowledgement and storage events acknowledge other tabs', () => {
        localStorage.setItem(storageKey, JSON.stringify(timestamp(100)));
        focused = false;
        const first = mount();
        snapshot([request('old', timestamp(100)), request('new', timestamp(100, 1))]);
        expect(document.title).toBe('(1) Kings-Talloc');
        first.unmount();
        mount();
        snapshot([request('old', timestamp(100)), request('new', timestamp(100, 1))]);
        expect(document.title).toBe('(1) Kings-Talloc');
        act(() => {
            localStorage.setItem(storageKey, JSON.stringify(timestamp(100, 1)));
            window.dispatchEvent(new StorageEvent('storage', { key: storageKey }));
        });
        expect(document.title).toBe('Kings-Talloc');
        expect(state().count).toBe(2);
    });

    test('cached results cannot acknowledge new requests; failures retain last data and retry recovers', () => {
        localStorage.setItem(storageKey, JSON.stringify(timestamp(100)));
        mount();
        const rows = [request('new', timestamp(101))];
        snapshot(rows, { fromCache: true });
        expect(state().ready).toBe(false);
        expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(timestamp(100)));
        snapshot(rows);
        act(() => fail(new Error('unavailable')));
        expect(state().count).toBe(1);
        expect(state().ready).toBe(false);
        expect(state().error).toBeTruthy();
        fireEvent.click(screen.getByText('Retry'));
        snapshot(rows);
        expect(state().ready).toBe(true);
        expect(state().error).toBeNull();
    });

    test('unrelated roles cannot subscribe and logout restores the title', () => {
        mount({ availableRoles: ['tutor'] }).unmount();
        expect(onSnapshot).not.toHaveBeenCalled();
        focused = false;
        const view = mount();
        snapshot([]);
        snapshot([request('new', timestamp(100))]);
        expect(document.title).toBe('(1) Kings-Talloc');
        view.unmount();
        expect(document.title).toBe('Kings-Talloc');
        expect(unsubscribe).toHaveBeenCalled();
    });

    test('other teachers see all future approvals but default to no title notifications', () => {
        focused = false;
        mount({ email: 'other@kings.edu.au' });
        snapshot([]);
        snapshot([request('new', timestamp(100))]);
        expect(state().available).toBe(true);
        expect(state().enabled).toBe(false);
        expect(state().count).toBe(1);
        expect(document.title).toBe('Kings-Talloc');
    });

    test('any teacher can opt in and out immediately without announcing an existing backlog', () => {
        focused = false;
        mount({ email: 'other@kings.edu.au' });
        const existing = request('existing', timestamp(100));
        snapshot([existing]);
        preferenceSnapshot({ requestNotificationsEnabled: true });
        expect(state().enabled).toBe(true);
        expect(document.title).toBe('Kings-Talloc');
        snapshot([existing, request('new', timestamp(101))]);
        expect(document.title).toBe('(1) Kings-Talloc');
        preferenceSnapshot({ requestNotificationsEnabled: false });
        expect(state().enabled).toBe(false);
        expect(document.title).toBe('Kings-Talloc');
        expect(state().count).toBe(2);
        expect(onSnapshot).toHaveBeenCalledTimes(2);
    });

    test('Michael can explicitly disable the default notification preference', () => {
        focused = false;
        preferenceData = { requestNotificationsEnabled: false };
        mount();
        snapshot([]);
        snapshot([request('new', timestamp(100))]);
        expect(state().enabled).toBe(false);
        expect(document.title).toBe('Kings-Talloc');
    });

    test('admin access alone cannot enable notifications even with a saved opt-in', () => {
        focused = false;
        preferenceData = { requestNotificationsEnabled: true };
        mount({ availableRoles: ['admin'] });
        snapshot([]);
        snapshot([request('new', timestamp(100))]);
        expect(state().available).toBe(true);
        expect(state().enabled).toBe(false);
        expect(document.title).toBe('Kings-Talloc');
    });

    test('teacher role enables notifications in either view without restarting the subscriptions', () => {
        focused = false;
        const view = mount({ userRole: 'admin' });
        snapshot([]);
        snapshot([request('new', timestamp(100))]);
        expect(document.title).toBe('(1) Kings-Talloc');
        view.rerender(<RequestNotificationsProvider email="mienna@kings.edu.au" availableRoles={['teacher', 'admin']} userRole="teacher"><Probe /></RequestNotificationsProvider>);
        expect(document.title).toBe('(1) Kings-Talloc');
        expect(onSnapshot).toHaveBeenCalledTimes(2);
    });

    test('a teacher without admin access can opt in', () => {
        focused = false;
        preferenceData = { requestNotificationsEnabled: true };
        mount({ email: 'teacher@kings.edu.au', availableRoles: ['teacher'] });
        snapshot([]);
        snapshot([request('new', timestamp(100))]);
        expect(document.title).toBe('(1) Kings-Talloc');
    });

    test.each([{ fromCache: true }, { hasPendingWrites: true }])('unconfirmed preference %j cannot acknowledge unseen requests', (metadata) => {
        const otherKey = REQUEST_ACK_STORAGE_PREFIX + 'other@kings.edu.au';
        localStorage.setItem(otherKey, JSON.stringify(timestamp(100)));
        focused = false;
        initialPreferenceMetadata = metadata;
        mount({ email: 'other@kings.edu.au' });
        snapshot([request('new', timestamp(101))]);
        expect(localStorage.getItem(otherKey)).toBe(JSON.stringify(timestamp(100)));
        preferenceSnapshot({ requestNotificationsEnabled: true });
        expect(document.title).toBe('(1) Kings-Talloc');
        expect(localStorage.getItem(otherKey)).toBe(JSON.stringify(timestamp(100)));
        focus(true);
        expect(document.title).toBe('Kings-Talloc');
        expect(localStorage.getItem(otherKey)).toBe(JSON.stringify(timestamp(101)));
    });

    test('retry recovers a failed preference listener as well as requests without consuming unseen notifications', () => {
        localStorage.setItem(storageKey, JSON.stringify(timestamp(100)));
        focused = false;
        mount();
        snapshot([request('new', timestamp(101))]);
        act(() => failPreference(new Error('unavailable')));
        expect(state().count).toBe(1);
        expect(state().error).toContain('notification settings');
        fireEvent.click(screen.getByText('Retry'));
        snapshot([request('new', timestamp(101))]);
        expect(onSnapshot).toHaveBeenCalledTimes(4);
        expect(state().error).toBeNull();
        expect(document.title).toBe('(1) Kings-Talloc');
    });
});
