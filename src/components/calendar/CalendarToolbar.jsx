'use client';

import { useContext } from 'react';
import { ChevronLeft, ChevronRight, FilterLines } from '@untitledui/icons';
import { Button } from '@/components/untitled/button';
import { CalendarUIContext } from '@/contexts/CalendarUIContext';
import useAuthSession from '@/hooks/useAuthSession';
import styles from '@/styles/calendarControls.module.css';

// RBC still owns date arithmetic, view availability and the displayed range label.
export default function CalendarToolbar({ label, localizer, onNavigate, onView, views, view }) {
    const { messages } = localizer;
    const { device } = useAuthSession() || {};
    // Phones hide the side filter panel, so the toolbar opens it as a dialog instead.
    const calendarUI = useContext(CalendarUIContext);
    const openFilters = device === 'mobile' ? calendarUI?.actions.setMobileFiltersOpen : null;
    return (
        <div className={`rbc-toolbar ${styles.toolbar}`}>
            <div className={styles.buttonGroup} role="group" aria-label="Calendar navigation">
                <Button size="sm" color="secondary" iconLeading={ChevronLeft} aria-label={messages.previous} onClick={() => onNavigate('PREV')} />
                <Button size="sm" color="secondary" onClick={() => onNavigate('TODAY')}>{messages.today}</Button>
                <Button size="sm" color="secondary" iconLeading={ChevronRight} aria-label={messages.next} onClick={() => onNavigate('NEXT')} />
            </div>
            <span className={`rbc-toolbar-label ${styles.rangeLabel}`}>{label}</span>
            {(views.length > 1 || openFilters) && <div className={styles.toolbarEnd}>
                {views.length > 1 && <div className={styles.buttonGroup} role="group" aria-label="Calendar view">
                    {views.map(name => (
                        <Button key={name} size="sm" color="secondary" aria-pressed={view === name}
                            className={view === name ? `rbc-active ${styles.activeView}` : undefined}
                            onClick={() => onView(name)}>{messages[name]}</Button>
                    ))}
                </div>}
                {openFilters && <div className={styles.buttonGroup}>
                    <Button size="sm" color="secondary" iconLeading={FilterLines} onClick={() => openFilters(true)}>Filters</Button>
                </div>}
            </div>}
        </div>
    );
}
