'use client';

import { ChevronLeft, ChevronRight } from '@untitledui/icons';
import { Button } from '@/components/untitled/button';
import styles from '@/styles/calendarControls.module.css';

// RBC still owns date arithmetic, view availability and the displayed range label.
export default function CalendarToolbar({ label, localizer, onNavigate, onView, views, view }) {
    const { messages } = localizer;
    return (
        <div className={`rbc-toolbar ${styles.toolbar}`}>
            <div className={styles.buttonGroup} role="group" aria-label="Calendar navigation">
                <Button size="sm" color="secondary" iconLeading={ChevronLeft} aria-label={messages.previous} onClick={() => onNavigate('PREV')} />
                <Button size="sm" color="secondary" onClick={() => onNavigate('TODAY')}>{messages.today}</Button>
                <Button size="sm" color="secondary" iconLeading={ChevronRight} aria-label={messages.next} onClick={() => onNavigate('NEXT')} />
            </div>
            <span className={`rbc-toolbar-label ${styles.rangeLabel}`}>{label}</span>
            {views.length > 1 && <div className={styles.buttonGroup} role="group" aria-label="Calendar view">
                {views.map(name => (
                    <Button key={name} size="sm" color="secondary" aria-pressed={view === name}
                        className={view === name ? `rbc-active ${styles.activeView}` : undefined}
                        onClick={() => onView(name)}>{messages[name]}</Button>
                ))}
            </div>}
        </div>
    );
}
