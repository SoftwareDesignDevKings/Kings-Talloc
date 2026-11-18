import { Button } from '@/components/untitled/button';
import styles from '@/styles/dashboard.module.css';
import { formatDisplayDateTime, formatDisplayTime } from '@/utils/displayDate';
import { sessionFocusLabel } from '@/lib/scheduling/sessionFocus';

const PendingApprovalItem = ({ request, onApprove, onReject, onDelete, readOnly, disabled = false }) => (
    <li className={styles.requestItem}>
        <div className={styles.requestContent}>
            <div>
                <div className={styles.requestTitle}>
                    {request.title || 'Untitled request'}
                </div>
                <div className={styles.requestDetails}>
                    {request.students && request.students.length > 0 && (
                        <div>
                            <strong>Student:</strong>{' '}
                            {request.students
                                .map((s) => s.label || s.value)
                                .join(', ')}
                        </div>
                    )}
                    {request.staff && request.staff.length > 0 && (
                        <div>
                            <strong>Tutor:</strong>{' '}
                            {request.staff
                                .map((t) => t.label || t.value)
                                .join(', ')}
                        </div>
                    )}
                </div>
            </div>

            <div className={styles.requestDetails}>
                <div>
                    {formatDisplayDateTime(request.start)}{' '}
                    - {formatDisplayTime(request.end)}
                </div>
                <div><strong>Session focus:</strong> {sessionFocusLabel(request.preference)}</div>
                {request.sessionTopics?.trim() && <details className="mt-1">
                    <summary>Topics to cover</summary>
                    <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{request.sessionTopics}</div>
                </details>}
                {request.additionalStudents?.length > 0 && <div>Other students: {request.additionalStudents.join(', ')}</div>}
                {request.classes?.length > 0 && (
                    <div>
                        Class:{' '}
                        {request.classes
                            .map((cls) => cls.label || cls.name || cls.value || cls)
                            .join(', ')}
                    </div>
                )}
                {!request.classes?.length && request.subject && (
                    <div>
                        Legacy subject:{' '}
                        {typeof request.subject === 'string'
                            ? request.subject
                            : request.subject.label}
                    </div>
                )}
            </div>

            {!readOnly && (
                <div className={styles.requestActions}>
                    <Button
                        size="xs" color="primary"
                        isDisabled={disabled}
                        onClick={(e) => { e.stopPropagation(); onApprove(request); }}
                    >
                        Approve
                    </Button>
                    <Button
                        size="xs" color="secondary-destructive"
                        isDisabled={disabled}
                        onClick={(e) => { e.stopPropagation(); onReject(request.id); }}
                    >
                        Reject
                    </Button>
                    <Button
                        size="xs" color="secondary-destructive"
                        isDisabled={disabled}
                        onClick={(e) => { e.stopPropagation(); onDelete(request.id); }}
                    >
                        Delete
                    </Button>
                </div>
            )}
        </div>
    </li>
);

export default PendingApprovalItem;
