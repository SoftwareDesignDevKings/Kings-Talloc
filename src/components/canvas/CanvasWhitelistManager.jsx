'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import useAlert from '@/hooks/useAlert';
import { RefreshCw01, SearchLg } from '@untitledui/icons';
import { Button } from '@/components/untitled/button';
import { Input } from '@/components/untitled/input';
import { Badge } from '@/components/untitled/badge';
import { TableCard } from '@/components/untitled/table-card';
import { Tabs } from '@/components/untitled/tabs';
import styles from '@/styles/canvasAdmin.module.css';
import { formatDisplayDate, formatDisplayDateTime } from '@/utils/displayDate';

// Each status check reads Firestore; a sync takes minutes, so 5s is responsive enough.
const POLL_INTERVAL_MS = 5000;

const formatDateTime = (value) => {
    if (!value) return 'Never';
    const date = value._seconds ? new Date(value._seconds * 1000) : new Date(value);
    if (isNaN(date)) return 'Never';
    return formatDisplayDateTime(date);
};

const formatShortDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date)) return '';
    return formatDisplayDate(date);
};

const formatTermDateRange = (startAt, endAt) => {
    const start = formatShortDate(startAt);
    const end = formatShortDate(endAt);
    if (start && end) return `${start} - ${end}`;
    if (start) return `From ${start}`;
    if (end) return `Until ${end}`;
    return '';
};

const SyncStatusBar = ({ status, error, onRetry, onTrigger, syncing }) => {
    const running = syncing || status?.is_running;
    const failed = status?.last_status === 'failed';
    const progress = status?.progress;
    return (
        <section className={styles.syncCard} aria-label="Canvas sync">
            <div className={styles.syncDetails}>
                <div className={styles.syncHeading}>
                    <h3>Canvas sync</h3>
                    <Badge color={error || (!running && failed) ? 'error' : running ? 'brand' : 'gray'}>
                        {error ? 'Status unavailable' : running ? 'Running' : failed ? 'Failed' : status ? 'Idle' : 'Loading'}
                    </Badge>
                </div>
                <p className={styles.hint}>Sync whitelisted courses and their enrollments from Canvas.</p>
                <div aria-live="polite" className={styles.syncProgress}>
                    {error ? <span role="alert">{error}</span> : !status ? 'Loading sync status…' : running ? (
                        <>
                            <strong>Syncing:</strong> {progress?.phase || 'In progress…'}
                            {progress?.totalCourses > 0 && <span> ({progress.completedCourses}/{progress.totalCourses} courses)</span>}
                        </>
                    ) : <><strong>Last sync:</strong> {failed ? `Failed — ${status.last_error || 'Unknown error'}` : formatDateTime(status.last_full_sync_at)}</>}
                </div>
            </div>
            <div className={styles.syncActions}>
                {error && <Button color="secondary" size="sm" onPress={onRetry}>Retry status</Button>}
                <Button color="secondary" size="sm" iconLeading={RefreshCw01} onPress={onTrigger}
                    isDisabled={!status || !!error || running} isLoading={running} showTextWhileLoading>
                    {running ? 'Running…' : 'Run Sync'}
                </Button>
            </div>
        </section>
    );
};

const ListState = ({ loading, error, onRetry, children }) => (
    <tr className={styles.stateRow}><td colSpan={5}>
        <div className={styles.tableState}>
            {loading ? <span role="status">Loading courses…</span> : error ? (
                <><span role="alert">{error}</span><Button color="secondary" size="sm" onPress={onRetry}>Retry courses</Button></>
            ) : children}
        </div>
    </td></tr>
);

const Cell = ({ label, children, className }) => (
    <td className={className}><span aria-hidden="true" className={styles.compactLabel}>{label}</span>{children}</td>
);

const CanvasWhitelistManager = () => {
    const { addAlert } = useAlert();

    const [whitelisted, setWhitelisted] = useState(null);
    const [available, setAvailable] = useState(null);
    const [syncStatus, setSyncStatus] = useState(null);
    const [statusError, setStatusError] = useState('');
    const [whitelistError, setWhitelistError] = useState('');
    const [availableError, setAvailableError] = useState('');
    const [whitelistLoading, setWhitelistLoading] = useState(true);
    const [availableLoading, setAvailableLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [activeTab, setActiveTab] = useState('whitelisted');
    const [search, setSearch] = useState('');
    const [removing, setRemoving] = useState(new Set());
    const [adding, setAdding] = useState(new Set());

    const pollRef = useRef(null);

    const fetchSyncStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/canvas/sync/status');
            if (!res.ok) throw new Error('Status unavailable');
            const data = await res.json();
            setSyncStatus(data);
            setStatusError('');
            return data;
        } catch {
            setStatusError('Could not load sync status. Retry to check whether a sync is running.');
            return null;
        }
    }, []);

    const refreshWhitelistedCourses = useCallback(async () => {
        setWhitelistLoading(true);
        setWhitelistError('');
        try {
            const res = await fetch('/api/canvas/whitelist');
            if (!res.ok) throw new Error('List unavailable');
            setWhitelisted(await res.json());
            return true;
        } catch {
            setWhitelistError('Could not load whitelisted courses.');
            return false;
        } finally {
            setWhitelistLoading(false);
        }
    }, []);

    const refreshAvailableCourses = useCallback(async () => {
        setAvailableLoading(true);
        setAvailableError('');
        try {
            const res = await fetch('/api/canvas/whitelist/available');
            if (!res.ok) throw new Error('List unavailable');
            setAvailable(await res.json());
        } catch {
            setAvailableError('Could not load Canvas courses.');
        } finally {
            setAvailableLoading(false);
        }
    }, []);

    const startPolling = useCallback(() => {
        if (pollRef.current) return;
        // A slow status response must not launch overlapping polling requests.
        let pending = false;
        pollRef.current = setInterval(async () => {
            if (pending) return;
            pending = true;
            const data = await fetchSyncStatus();
            pending = false;
            if (data && !data.is_running) {
                clearInterval(pollRef.current);
                pollRef.current = null;
                setSyncing(false);
                if (data.last_status === 'success') {
                    const refreshed = await refreshWhitelistedCourses();
                    if (!refreshed) addAlert('error', 'Canvas sync completed, but the whitelisted list could not refresh.');
                    addAlert('success', 'Canvas sync completed successfully.');
                } else if (data.last_status === 'failed') {
                    addAlert('error', `Sync failed: ${data.last_error}`);
                }
            }
        }, POLL_INTERVAL_MS);
    }, [fetchSyncStatus, refreshWhitelistedCourses, addAlert]);

    const retrySyncStatus = async () => {
        const data = await fetchSyncStatus();
        if (data?.is_running) startPolling();
    };

    useEffect(() => {
        let mounted = true;
        refreshWhitelistedCourses();
        refreshAvailableCourses();
        fetchSyncStatus().then(data => {
            if (mounted && data?.is_running) startPolling();
        });
        return () => {
            mounted = false;
            clearInterval(pollRef.current);
            pollRef.current = null;
        };
    }, [fetchSyncStatus, refreshWhitelistedCourses, refreshAvailableCourses, startPolling]);

    const whitelistedIds = new Set((whitelisted || []).map((c) => String(c.course_id)));

    const handleAdd = async (course) => {
        const id = String(course.id);
        setAdding((prev) => new Set(prev).add(id));
        try {
            const res = await fetch('/api/canvas/whitelist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: course.id,
                    name: course.name,
                    course_code: course.course_code,
                    term_id: course.term_id,
                    term_name: course.term_name,
                    term_start_at: course.term_start_at,
                    term_end_at: course.term_end_at,
                }),
            });
            if (!res.ok) throw new Error((await res.json()).message || 'Failed');
            const added = await res.json();
            setWhitelisted((prev) => [...(prev || []), added].sort((a, b) => a.name?.localeCompare(b.name)));
            addAlert('success', `"${course.name}" added to whitelist.`);
        } catch (err) {
            addAlert('error', `Could not add course: ${err.message}`);
        } finally {
            setAdding((prev) => { const s = new Set(prev); s.delete(id); return s; });
        }
    };

    const handleRemove = async (courseId, name) => {
        if (!window.confirm(`Remove "${name}" from the Canvas whitelist? It will no longer be included in future course syncs.`)) return;
        const id = String(courseId);
        setRemoving((prev) => new Set(prev).add(id));
        try {
            const res = await fetch(`/api/canvas/whitelist/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error((await res.json()).message || 'Failed');
            setWhitelisted((prev) => (prev || []).filter((c) => String(c.course_id) !== id));
            addAlert('success', `"${name}" removed from whitelist.`);
        } catch (err) {
            addAlert('error', `Could not remove course: ${err.message}`);
        } finally {
            setRemoving((prev) => { const s = new Set(prev); s.delete(id); return s; });
        }
    };

    const handleTriggerSync = async () => {
        setSyncing(true);
        try {
            const res = await fetch('/api/canvas/sync/trigger', { method: 'POST' });
            const data = await res.json();
            if (data.status === 'already_running') {
                addAlert('info', 'A sync is already in progress.');
                startPolling();
                return;
            }
            if (!res.ok) throw new Error(data.message || 'Failed to trigger sync');
            if (data.status === 'completed' || data.status === 'success') {
                await fetchSyncStatus();
                const refreshed = await refreshWhitelistedCourses();
                if (!refreshed) {
                    addAlert('error', 'Canvas sync completed, but the whitelisted list could not refresh.');
                }
                addAlert('success', 'Canvas sync completed successfully.');
                setSyncing(false);
                return;
            }
            await fetchSyncStatus();
            startPolling();
        } catch (err) {
            addAlert('error', `Sync error: ${err.message}`);
            setSyncing(false);
        }
    };

    const filteredAvailable = (available || []).filter((c) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
            (c.name || '').toLowerCase().includes(q) ||
            (c.course_code || '').toLowerCase().includes(q) ||
            (c.term_name || '').toLowerCase().includes(q)
        );
    });

    const isWhitelist = activeTab === 'whitelisted';
    const rows = isWhitelist ? whitelisted || [] : filteredAvailable;
    const loading = isWhitelist ? whitelistLoading : availableLoading;
    const error = isWhitelist ? whitelistError : availableError;
    const total = isWhitelist ? whitelisted?.length : available?.length;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <p>Choose which Canvas courses are included in the sync.</p>
            </header>
            <SyncStatusBar status={syncStatus} error={statusError} onRetry={retrySyncStatus}
                onTrigger={handleTriggerSync} syncing={syncing} />
            <Tabs selectedKey={activeTab} onSelectionChange={setActiveTab} className={styles.tabs}>
                <Tabs.List type="underline" size="sm" aria-label="Canvas courses" className={styles.tabList}>
                    <Tabs.Item id="whitelisted" badge={whitelisted?.length} className={styles.tab}>Whitelisted</Tabs.Item>
                    <Tabs.Item id="available" badge={available?.length} className={styles.tab}>All Canvas courses</Tabs.Item>
                </Tabs.List>
                {['whitelisted', 'available'].map(key => (
                    <Tabs.Panel key={key} id={key} className={styles.panel}>
                        <TableCard.Root className={styles.tableCard}>
                            <div className={styles.toolbar}>
                                <div>
                                    <h3>{isWhitelist ? 'Whitelisted courses' : 'All Canvas courses'}</h3>
                                    <p className={styles.hint}>{isWhitelist ? 'These courses are included when you run a sync.' : 'Search current-year courses and add them to the whitelist.'}</p>
                                </div>
                                {!isWhitelist && <div className={styles.search}>
                                    <Input size="sm" icon={SearchLg} aria-label="Search Canvas courses"
                                        placeholder="Search by name, code, or term" value={search} onChange={setSearch} />
                                </div>}
                            </div>
                            <div className={styles.tableRegion} role="region" aria-label={isWhitelist ? 'Whitelisted courses table' : 'All Canvas courses table'} tabIndex={0}>
                                <table className={styles.table} aria-label={isWhitelist ? 'Whitelisted courses' : 'All Canvas courses'}>
                                    <thead><tr>
                                        <th scope="col">Course Name</th><th scope="col">Code</th>
                                        <th scope="col">{isWhitelist ? 'Blueprint' : 'Term'}</th>
                                        <th scope="col">{isWhitelist ? 'Last Synced' : 'State'}</th>
                                        <th scope="col" className={styles.actionHeading}>Actions</th>
                                    </tr></thead>
                                    <tbody>
                                        {loading || error || rows.length === 0 ? (
                                            <ListState loading={loading} error={error} onRetry={isWhitelist ? refreshWhitelistedCourses : refreshAvailableCourses}>
                                                {isWhitelist ? <>
                                                    <span>No courses whitelisted yet. Add some from the All Canvas courses tab.</span>
                                                    <Button color="secondary" size="sm" onPress={() => setActiveTab('available')}>Browse Canvas courses</Button>
                                                </> : <>
                                                    <span>No courses found.</span>
                                                    {search.trim() && <Button color="secondary" size="sm" onPress={() => setSearch('')}>Clear search</Button>}
                                                </>}
                                            </ListState>
                                        ) : rows.map(c => {
                                            const id = String(isWhitelist ? c.course_id : c.id);
                                            const added = whitelistedIds.has(id);
                                            const termDates = formatTermDateRange(c.term_start_at, c.term_end_at);
                                            return <tr key={id}>
                                                <Cell label="Course Name" className={styles.courseName}>{c.name || '—'}</Cell>
                                                <Cell label="Code">{c.courseCode || c.course_code || '—'}</Cell>
                                                <Cell label={isWhitelist ? 'Blueprint' : 'Term'}>
                                                    {isWhitelist ? c.blueprint_course_name ? (
                                                        <Badge color="brand" className={styles.wrappingBadge} title={`Blueprint ID: ${c.blueprint_course_id}`}>{c.blueprint_course_name}</Badge>
                                                    ) : '—' : <>
                                                        <div>{c.term_name || '—'}</div>
                                                        {termDates && <small className={styles.termDates}>{termDates}</small>}
                                                    </>}
                                                </Cell>
                                                <Cell label={isWhitelist ? 'Last Synced' : 'State'}>
                                                    {isWhitelist ? formatDateTime(c.last_synced) : <Badge color={c.workflow_state === 'available' ? 'success' : 'gray'}>{c.workflow_state || '—'}</Badge>}
                                                </Cell>
                                                <Cell label="Actions"><div className={styles.rowActions}>
                                                    {isWhitelist ? (
                                                        <Button color="secondary-destructive" size="sm" isLoading={removing.has(id)} showTextWhileLoading
                                                            onPress={() => handleRemove(c.course_id, c.name)}>Remove</Button>
                                                    ) : (
                                                        <Button color="secondary" size="sm" isDisabled={added || whitelistLoading || !!whitelistError}
                                                            isLoading={adding.has(id)} showTextWhileLoading onPress={() => handleAdd(c)}>{added ? 'Added' : 'Add'}</Button>
                                                    )}
                                                </div></Cell>
                                            </tr>;
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className={styles.tableSummary} aria-live="polite">
                                {loading ? 'Loading courses…' : error ? 'Courses unavailable' : `${rows.length} of ${total ?? 0} courses`}
                                {!isWhitelist && whitelistError && <span> · Whitelist unavailable. <Button color="link-color" size="sm" onPress={refreshWhitelistedCourses}>Retry whitelist</Button></span>}
                            </div>
                        </TableCard.Root>
                    </Tabs.Panel>
                ))}
            </Tabs>
        </div>
    );
};

export default CanvasWhitelistManager;
