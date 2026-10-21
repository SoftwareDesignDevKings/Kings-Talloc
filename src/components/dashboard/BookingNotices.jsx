'use client';
import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, where, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firestore/firestoreClient';
import { recordSnapshotReads } from '@/lib/telemetry/clientReads';
import useAuthSession from '@/hooks/useAuthSession';
import { formatDisplayDateTime } from '@/utils/displayDate';
import { Bell01 } from '@untitledui/icons';
import { Button } from '@/components/untitled/button';
import { TableCard } from '@/components/untitled/table-card';
import styles from '@/styles/dashboard.module.css';

export default function BookingNotices() {
    const { session } = useAuthSession();
    const email = session?.user?.email?.toLowerCase();
    const [notices, setNotices] = useState([]);
    const [ack, setAck] = useState(null);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        setNotices([]); setAck(null); setReady(false); setError(null);
        if (!email) return;
        const fail = () => { setReady(false); setError('Unable to refresh booking updates.'); };
        const unsubscribe = onSnapshot(query(collection(db, 'bookingNotifications'), where('recipientEmail', '==', email)), snapshot => {
            recordSnapshotReads('bookingNotifications', snapshot);
            setNotices(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })).filter(notice => notice.kind !== 'assigned').sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
            setReady(!snapshot.metadata.fromCache); setError(null);
        }, fail);
        const unsubscribeAck = onSnapshot(doc(db, 'bookingNotificationState', email), snapshot => { recordSnapshotReads('bookingNotificationState', snapshot); setAck(snapshot.data()?.acknowledgedAt || null); }, fail);
        return () => { unsubscribe(); unsubscribeAck(); };
    }, [email]);
    const unseen = ack ? notices.filter(notice => notice.createdAt.toMillis() > ack.toMillis()) : notices;
    const dismiss = async () => {
        try {
            // Acknowledge only notices actually loaded; a concurrent arrival stays visible.
            const latest = notices[0]?.createdAt;
            if (latest) await runTransaction(db, async transaction => {
                const ref = doc(db, 'bookingNotificationState', email);
                const state = await transaction.get(ref);
                if (!state.data()?.acknowledgedAt || state.data().acknowledgedAt.toMillis() < latest.toMillis()) {
                    transaction.set(ref, { acknowledgedAt: latest, updatedAt: serverTimestamp() });
                }
            });
        } catch { setError('Unable to dismiss updates. Please retry.'); }
    };
    if (!unseen.length && !error) return null;
    return <TableCard.Root role="region" aria-label="Booking updates" className={styles.notices}>
        <header className={styles.listHeader}>
            <Bell01 aria-hidden="true" />
            <h6 className={styles.listTitle}>Booking updates</h6>
            {unseen.length > 0 && <Button size="sm" color="secondary" isDisabled={!ready} onClick={dismiss}>Dismiss updates</Button>}
        </header>
        {error && <div role="status" className={styles.noticeError}>{error}</div>}
        <ul className={styles.noticeList}>{unseen.map(notice => <li key={notice.id} className={styles.noticeItem}>
            <a href={`/calendar?date=${encodeURIComponent(notice.start.toDate().toISOString())}`}>{notice.title} — {formatDisplayDateTime(notice.start)}</a>: {notice.message}
        </li>)}</ul>
    </TableCard.Root>;
}
