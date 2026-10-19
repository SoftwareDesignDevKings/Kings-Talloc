import React from 'react';
import { isStudentSession } from '@/lib/scheduling/eventRules';
import { sessionFocusLabel } from '@/lib/scheduling/sessionFocus';
import { MdSchool } from '@/components/icons';
import { Badge } from '@/components/untitled/badge';
import { Label } from '@/components/untitled/label';
import { EventSection, EventSelect } from './EventFormUI';
import styles from '@/styles/staffEventForm.module.css';

const StudentRequestSection = ({ newEvent, handleApprovalChange, approvalOptions, readOnly }) => {
    if (!newEvent.createdByStudent && !isStudentSession(newEvent)) return null;
    const classLabel = newEvent.classes?.[0]?.label || newEvent.classes?.[0]?.name || null;
    return <EventSection id="studentRequest" title="Session focus" defaultExpanded={newEvent.approvalStatus === 'pending'} icon={MdSchool} trailing={newEvent.createdByStudent && <Badge size="sm" color="brand">STUDENT SUBMITTED</Badge>}>
        <div className={styles.fields}>
            <div className={styles.grid}>
                {classLabel ? <div className={styles.field}><Label isRequired={false}>Class</Label><span>{classLabel}</span></div>
                    : newEvent.subject ? <div className={styles.field}><Label isRequired={false}>Legacy Subject</Label><span>{newEvent.subject.label || newEvent.subject}</span></div> : null}
                <div className={styles.field}><Label isRequired={false}>Focus</Label><span>{sessionFocusLabel(newEvent.preference)}</span></div>
            </div>
            {newEvent.sessionTopics?.trim() && <div className={styles.field}><Label isRequired={false}>Topics to cover</Label><div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{newEvent.sessionTopics}</div></div>}
            {!readOnly && <div className={styles.field}>
                <EventSelect label="Administrative Decision" name="approvalStatus" options={approvalOptions} value={newEvent.approvalStatus}
                    onChange={handleApprovalChange} aria-label="Student request approval status" />
                <small className={styles.hint}>Approving this request will automatically schedule the session and notify the student.</small>
            </div>}
        </div>
    </EventSection>;
};
export default React.memo(StudentRequestSection);
