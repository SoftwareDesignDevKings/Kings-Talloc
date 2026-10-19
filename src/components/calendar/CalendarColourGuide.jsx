'use client';

import { CALENDAR_COLOURS, getCalendarPaletteStyle } from '@/constants/calendarColours';
import { getCalendarColourGuide } from '@/utils/calendarColourGuide';
import styles from '@/styles/calendarColourGuide.module.css';

export default function CalendarColourGuide({ userRole, descriptions = false }) {
    return <div data-calendar-colour-guide={userRole} data-descriptions={descriptions || undefined} className={styles.list}>
        {getCalendarColourGuide(userRole).map(({ key, label, description }) => <div key={key} data-calendar-colour={key} className={styles.entry}>
            <span aria-hidden="true" data-calendar-colour-swatch className={styles.swatch} style={key === 'availabilityHeatmap'
                ? { backgroundColor: CALENDAR_COLOURS[key].bg, border: '1px solid var(--uui-color-border-secondary)', borderRadius: '4px' }
                : getCalendarPaletteStyle(CALENDAR_COLOURS[key])} />
            <div className={styles.text}><span className={styles.label}>{label}</span>
                {descriptions && <p className={styles.description}>{description}</p>}
            </div>
        </div>)}
    </div>;
}
