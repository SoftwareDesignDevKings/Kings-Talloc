import { useEffect, useState, useCallback } from 'react';

export default function useBookableAvailability(email, enabled, range) {
    const [state, setState] = useState({ slots: [], ready: false, error: null });
    const [revision, setRevision] = useState(0);
    const refresh = useCallback(() => setRevision(value => value + 1), []);
    const start = range.start.toISOString(), end = range.end.toISOString();
    const students = JSON.stringify([...new Set(range.students || [])].sort());
    const requestKey = JSON.stringify([email, start, end, students]);
    useEffect(() => { setState({ slots: [], ready: false, error: null }); }, [email]);
    useEffect(() => {
        if (!enabled || !email) return;
        let cancelled = false;
        const controller = new AbortController();
        setState(previous => ({ ...previous, ready: false }));
        let generation = 0;
        const load = async () => {
            const current = ++generation;
            try {
                const response = await fetch(`/api/availability?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&students=${encodeURIComponent(students)}`, { cache: 'no-store', signal: controller.signal });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                if (!cancelled && current === generation) setState({ slots: data.slots.map(slot => ({ ...slot, start: new Date(slot.start), end: new Date(slot.end) })), ready: true, error: null, requestKey });
            } catch (error) {
                if (!cancelled && current === generation) setState(previous => ({ ...previous, ready: false, error: 'Unable to refresh availability. Please retry before booking.' }));
            }
        };
        load();
        const timer = setInterval(load, 30000);
        const resume = () => { if (document.visibilityState === 'visible') load(); };
        document.addEventListener('visibilitychange', resume);
        window.addEventListener('focus', resume);
        window.addEventListener('online', resume);
        const offline = () => setState(previous => ({ ...previous, ready: false, error: 'Waiting for a connection to refresh availability.' }));
        window.addEventListener('offline', offline);
        window.addEventListener('talloc:schedule-changed', load);
        return () => { cancelled = true; controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', resume); window.removeEventListener('focus', resume); window.removeEventListener('online', resume); window.removeEventListener('offline', offline); window.removeEventListener('talloc:schedule-changed', load); };
    }, [email, enabled, start, end, students, requestKey, revision]);
    return { ...state, ready: state.ready && state.requestKey === requestKey, refresh };
}
