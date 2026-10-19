import React from 'react';
import { workCategory } from '@/lib/scheduling/eventRules';
import { MdSettings } from '@/components/icons';
import { EventSection, EventSelect } from './EventFormUI';
import styles from '@/styles/staffEventForm.module.css';

const SettingsSection = ({ newEvent, setNewEvent, onWorkTypeChange, workTypeOptions, workStatusOptions, readOnly, userRole }) => {
    return <EventSection id="settings" title="Settings & Status" icon={MdSettings}>
        <div className={styles.grid}>
            <EventSelect label="Work Type" name="workType" options={workTypeOptions} value={workCategory(newEvent)}
                onChange={option => onWorkTypeChange(option.value)} isDisabled={readOnly} aria-label="Event work type" />
            <EventSelect label="Work Status" name="workStatus" options={workStatusOptions} value={newEvent.workStatus || 'notCompleted'}
                onChange={option => setNewEvent(prev => ({ ...prev, workStatus: option.value }))}
                isDisabled={readOnly && userRole !== 'tutor' && userRole !== 'coach'} aria-label="Event work status" />
        </div>
    </EventSection>;
};
export default React.memo(SettingsSection);
