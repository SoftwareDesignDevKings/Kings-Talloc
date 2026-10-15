import { formatDisplayDateTime, formatDisplayTime } from '@/utils/displayDate';
import { sessionFocusLabel } from '@/lib/scheduling/sessionFocus';

const PendingApprovalItem = ({ request, onApprove, onReject, onDelete, readOnly, disabled = false }) => (
    <div className="list-group-item">
        <div className="d-flex flex-column gap-2">
            <div>
                <div className="fw-semibold">
                    {request.title || 'Untitled Request'}
                </div>
                <div className="small text-muted mt-1">
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

            <div className="small text-muted">
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
                <div className="d-flex gap-2">
                    <button
                        className="btn btn-sm btn-success"
                        disabled={disabled}
                        onClick={(e) => { e.stopPropagation(); onApprove(request); }}
                    >
                        Approve
                    </button>
                    <button
                        className="btn btn-sm btn-secondary"
                        disabled={disabled}
                        onClick={(e) => { e.stopPropagation(); onReject(request.id); }}
                    >
                        Reject
                    </button>
                    <button
                        className="btn btn-sm btn-danger"
                        disabled={disabled}
                        onClick={(e) => { e.stopPropagation(); onDelete(request.id); }}
                    >
                        Delete
                    </button>
                </div>
            )}
        </div>
    </div>
);

export default PendingApprovalItem;
