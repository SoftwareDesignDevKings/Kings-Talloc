'use client';

import styles from '@/styles/filterPanel.module.css';
import CalendarColourGuide from './CalendarColourGuide';

export default function CalendarLegend({ userRole }) {
    return <div>
        <div className={styles.legendHeader}>
            <div className={styles.filterSectionLabel}>Calendar Legend</div>
        </div>
        <CalendarColourGuide userRole={userRole} />
    </div>;
}
