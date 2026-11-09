'use client';

import { ChevronLeft, ChevronRight, FilterLines } from '@untitledui/icons';
import { Button } from '@/components/untitled/button';
import styles from '@/styles/calendarControls.module.css';

// RBC still owns date arithmetic, view availability and the displayed range label.
// onOpenFilters is only passed on phones, where Filters live in a sheet instead of the side panel.
export default function CalendarToolbar({ label, localizer, onNavigate, onView, views, view, onOpenFilters }) {
    const { messages } = localizer;
    return (
        <div className={`rbc-toolbar ${styles.toolbar} ${onOpenFilters ? styles.compact : ''}`}>
            <div className={`${styles.buttonGroup} ${styles.navGroup}`} role="group" aria-label="Calendar navigation">
                <Button size="sm" color="secondary" iconLeading={ChevronLeft} aria-label={messages.previous} onClick={() => onNavigate('PREV')} />
                <Button size="sm" color="secondary" onClick={() => onNavigate('TODAY')}>{messages.today}</Button>
                <Button size="sm" color="secondary" iconLeading={ChevronRight} aria-label={messages.next} onClick={() => onNavigate('NEXT')} />
            </div>
            <span className={`rbc-toolbar-label ${styles.rangeLabel}`}>{label}</span>
            {views.length > 1 && <div className={`${styles.buttonGroup} ${styles.viewGroup}`} role="group" aria-label="Calendar view">
                {views.map(name => (
                    <Button key={name} size="sm" color="secondary" aria-pressed={view === name}
                        className={view === name ? `rbc-active ${styles.activeView}` : undefined}
                        onClick={() => onView(name)}>{messages[name]}</Button>
                ))}
            </div>}
            {onOpenFilters && (
                <Button size="sm" color="secondary" iconLeading={FilterLines} className={styles.filtersButton}
                    aria-haspopup="dialog" onClick={onOpenFilters}>Filters</Button>
            )}
        </div>
    );
}
