'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import useAlert from '@/hooks/useAlert';
import t from '@/styles/manageTable.module.css';

const POLL_INTERVAL_MS = 3000;

const formatDateTime = (value) => {
    if (!value) return 'Never';
    const date = value._seconds ? new Date(value._seconds * 1000) : new Date(value);
    if (isNaN(date)) return 'Never';
    return date.toLocaleString(undefined, {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

const SyncStatusBar = ({ status, onTrigger, syncing }) => {
    if (!status) return null;
    const { is_running, progress, last_status, last_error, last_full_sync_at } = status;

    return (
        <div className={`alert mb-3 py-2 px-3 d-flex align-items-center justify-content-between flex-wrap gap-2 ${is_running ? 'alert-info' : last_status === 'failed' ? 'alert-danger' : 'alert-secondary'}`} style={{ fontSize: '0.85rem' }}>
            <div>
                {is_running ? (
                    <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                        <strong>Syncing:</strong> {progress?.phase || 'In progress…'}
                        {progress?.totalCourses > 0 && (
                            <span className="ms-2 text-muted">
                                ({progress.completedCourses}/{progress.totalCourses} courses)
                            </span>
                        )}
                    </>
                ) : (
                    <>
                        <strong>Last sync:</strong>{' '}
                        {last_status === 'failed'
                            ? <span className="text-danger">Failed — {last_error}</span>
                            : last_full_sync_at
                                ? formatDateTime(last_full_sync_at)
                                : 'Never'}
                    </>
                )}
            </div>
            <button
                className="btn btn-sm btn-outline-primary"
                onClick={onTrigger}
                disabled={syncing || is_running}
            >
                {syncing || is_running ? 'Running…' : 'Run Sync'}
            </button>
        </div>
    );
};

const CanvasWhitelistManager = () => {
    const { addAlert } = useAlert();

    const [whitelisted, setWhitelisted] = useState(null);
    const [available, setAvailable] = useState(null);
    const [syncStatus, setSyncStatus] = useState(null);
    const [syncing, setSyncing] = useState(false);
    const [activeTab, setActiveTab] = useState('whitelisted');
    const [search, setSearch] = useState('');
    const [removing, setRemoving] = useState(new Set());
    const [adding, setAdding] = useState(new Set());

    const pollRef = useRef(null);

    const fetchSyncStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/canvas/sync/status');
            if (!res.ok) return;
            const data = await res.json();
            setSyncStatus(data);
            return data;
        } catch {
            return null;
        }
    }, []);

    const startPolling = useCallback(() => {
        if (pollRef.current) return;
        pollRef.current = setInterval(async () => {
            const data = await fetchSyncStatus();
            if (data && !data.is_running) {
                clearInterval(pollRef.current);
                pollRef.current = null;
                setSyncing(false);
                if (data.last_status === 'success') {
                    addAlert('success', 'Canvas sync completed successfully.');
                } else if (data.last_status === 'failed') {
                    addAlert('error', `Sync failed: ${data.last_error}`);
                }
            }
        }, POLL_INTERVAL_MS);
    }, [fetchSyncStatus, addAlert]);

    useEffect(() => {
        const load = async () => {
            const [wRes, aRes] = await Promise.all([
                fetch('/api/canvas/whitelist'),
                fetch('/api/canvas/whitelist/available'),
            ]);
            if (wRes.ok) setWhitelisted(await wRes.json());
            if (aRes.ok) setAvailable(await aRes.json());
        };
        load();
        fetchSyncStatus();
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [fetchSyncStatus]);

    const whitelistedIds = new Set((whitelisted || []).map((c) => String(c.course_id)));

    const handleAdd = async (course) => {
        const id = String(course.id);
        setAdding((prev) => new Set(prev).add(id));
        try {
            const res = await fetch('/api/canvas/whitelist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ course_id: course.id, name: course.name, course_code: course.course_code }),
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
                setSyncing(false);
                startPolling();
                return;
            }
            if (!res.ok) throw new Error(data.message || 'Failed to trigger sync');
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
        return (c.name || '').toLowerCase().includes(q) || (c.course_code || '').toLowerCase().includes(q);
    });

    return (
        <div className={t.container}>
            <h2 className="h4 mb-3 fw-bold text-tks-secondary">Canvas Admin</h2>

            <SyncStatusBar
                status={syncStatus}
                onTrigger={handleTriggerSync}
                syncing={syncing}
            />

            <ul className="nav nav-tabs mb-3">
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'whitelisted' ? 'active' : ''}`}
                        onClick={() => setActiveTab('whitelisted')}
                    >
                        Whitelisted
                        {whitelisted && (
                            <span className="badge bg-secondary ms-2">{whitelisted.length}</span>
                        )}
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'available' ? 'active' : ''}`}
                        onClick={() => setActiveTab('available')}
                    >
                        All Canvas Courses
                        {available && (
                            <span className="badge bg-secondary ms-2">{available.length}</span>
                        )}
                    </button>
                </li>
            </ul>

            {activeTab === 'whitelisted' && (
                <div className={t.tableWrap}>
                    <table className={`table table-hover mb-0 ${t.table}`}>
                        <colgroup>
                            <col />
                            <col style={{ width: '16%' }} />
                            <col style={{ width: '20%' }} />
                            <col style={{ width: '18%' }} />
                            <col style={{ width: '12%' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th>Course Name</th>
                                <th>Code</th>
                                <th>Blueprint</th>
                                <th>Last Synced</th>
                                <th className={t.actionCol} style={{ textAlign: 'right' }}><span className="visually-hidden">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {whitelisted === null ? (
                                <tr><td colSpan={5} className="text-center py-4"><span className="spinner-border spinner-border-sm" /></td></tr>
                            ) : whitelisted.length === 0 ? (
                                <tr><td colSpan={5} className="text-muted text-center py-4">No courses whitelisted yet. Add some from the All Canvas Courses tab.</td></tr>
                            ) : (
                                whitelisted.map((c) => (
                                    <tr key={c.course_id}>
                                        <td>{c.name || '—'}</td>
                                        <td>{c.courseCode || c.course_code || '—'}</td>
                                        <td>
                                            {c.blueprint_course_name
                                                ? <span className="badge bg-info text-dark" title={`Blueprint ID: ${c.blueprint_course_id}`}>{c.blueprint_course_name}</span>
                                                : <span className="text-muted">—</span>}
                                        </td>
                                        <td>{formatDateTime(c.last_synced)}</td>
                                        <td className={t.actionCol} style={{ textAlign: 'right' }}>
                                            <div className={t.actionGroup} style={{ justifyContent: 'flex-end' }}>
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    disabled={removing.has(String(c.course_id))}
                                                    onClick={() => handleRemove(c.course_id, c.name)}
                                                >
                                                    {removing.has(String(c.course_id)) ? '…' : 'Remove'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'available' && (
                <>
                    <div className={t.headerActions} style={{ marginBottom: '0.75rem' }}>
                        <div className={t.searchWrapper}>
                            <input
                                type="text"
                                placeholder="Search by name or code"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="form-control"
                            />
                        </div>
                    </div>
                    <div className={t.tableWrap}>
                        <table className={`table table-hover mb-0 ${t.table}`}>
                            <colgroup>
                                <col />
                                <col style={{ width: '16%' }} />
                                <col style={{ width: '14%' }} />
                                <col style={{ width: '14%' }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th>Course Name</th>
                                    <th>Code</th>
                                    <th>State</th>
                                    <th className={t.actionCol} style={{ textAlign: 'right' }}><span className="visually-hidden">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {available === null ? (
                                    <tr><td colSpan={4} className="text-center py-4"><span className="spinner-border spinner-border-sm" /></td></tr>
                                ) : filteredAvailable.length === 0 ? (
                                    <tr><td colSpan={4} className="text-muted text-center py-4">No courses found.</td></tr>
                                ) : (
                                    filteredAvailable.map((c) => {
                                        const id = String(c.id);
                                        const isWhitelisted = whitelistedIds.has(id);
                                        return (
                                            <tr key={id} style={isWhitelisted ? { opacity: 0.5 } : undefined}>
                                                <td>{c.name || '—'}</td>
                                                <td>{c.course_code || '—'}</td>
                                                <td>
                                                    <span className={`badge ${c.workflow_state === 'available' ? 'bg-success' : 'bg-secondary'}`}>
                                                        {c.workflow_state || '—'}
                                                    </span>
                                                </td>
                                                <td className={t.actionCol}>
                                                    <div className={t.actionGroup}>
                                                        <button
                                                            className="btn btn-sm btn-outline-primary"
                                                            disabled={isWhitelisted || adding.has(id)}
                                                            onClick={() => handleAdd(c)}
                                                        >
                                                            {isWhitelisted ? 'Added' : adding.has(id) ? '…' : 'Add'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default CanvasWhitelistManager;
