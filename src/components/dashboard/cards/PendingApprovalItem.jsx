import { format } from 'date-fns';

const PendingApprovalItem = ({ request, onApprove, onReject, onDelete, readOnly }) => (
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
                    {format(request.start, 'MMM d, yyyy h:mm a')}{' '}
                    - {format(request.end, 'h:mm a')}
                </div>
                {request.subject && (
                    <div>
                        Subject:{' '}
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
                        onClick={(e) => { e.stopPropagation(); onApprove(request); }}
                    >
                        Approve
                    </button>
                    <button
                        className="btn btn-sm btn-secondary"
                        onClick={(e) => { e.stopPropagation(); onReject(request.id); }}
                    >
                        Reject
                    </button>
                    <button
                        className="btn btn-sm btn-danger"
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
