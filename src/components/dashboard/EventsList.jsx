import React from 'react';
import { FiCalendar } from '@/components/icons';
import { format } from 'date-fns';

const workTypeColor = (workType) => {
    if (workType === 'coaching') return '#9B59B6';
    return 'blue';
};

const EventsList = ({ events, title, emptyMessage, userRole, isToday = false }) => {
    return (
        <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white border-bottom d-flex align-items-center gap-2 py-3">
                <FiCalendar className="text-muted" size={16} />
                <h6 className="mb-0 fw-semibold text-dark">{title}</h6>
                {events.length > 0 && (
                    <span className="badge rounded-pill bg-secondary bg-opacity-10 text-secondary ms-auto" style={{ fontSize: '0.7rem' }}>
                        {events.length}
                    </span>
                )}
            </div>
            <div className="card-body p-0">
                {events.length === 0 ? (
                    <div className="text-center py-5 px-3">
                        <FiCalendar className="text-muted mb-2" size={32} />
                        <p className="text-muted small mb-0">{emptyMessage}</p>
                    </div>
                ) : (
                    <div>
                        {events.map((event, index) => {
                            const accentColor = workTypeColor(event.workType);
                            const staffNames = event.staff?.map(s => s.label || s.value) || [];
                            const isPending = event.createdByStudent && event.approvalStatus === 'pending';
                            const isApproved = event.createdByStudent && event.approvalStatus === 'approved';

                            return (
                                <div
                                    key={event.id}
                                    className="d-flex align-items-stretch"
                                    style={{
                                        borderBottom: index < events.length - 1 ? '1px solid #f1f3f5' : 'none',
                                    }}
                                >
                                    {/* Time column */}
                                    <div
                                        className="flex-shrink-0 d-flex flex-column align-items-end justify-content-center px-3 py-3"
                                        style={{ width: '80px' }}
                                    >
                                        <span className="text-muted" style={{ fontSize: '0.72rem', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                            {isToday
                                                ? format(new Date(event.start), 'h:mm a')
                                                : format(new Date(event.start), 'd MMM')}
                                        </span>
                                        {isToday && (
                                            <span className="text-muted" style={{ fontSize: '0.72rem', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', opacity: 0.6 }}>
                                                {format(new Date(event.end), 'h:mm a')}
                                            </span>
                                        )}
                                    </div>

                                    {/* Accent bar */}
                                    <div
                                        style={{
                                            width: '3px',
                                            borderRadius: '2px',
                                            backgroundColor: accentColor,
                                            margin: '10px 0',
                                            flexShrink: 0,
                                        }}
                                    />

                                    {/* Content */}
                                    <div className="flex-grow-1 px-3 py-3">
                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                            <span className="fw-semibold text-dark" style={{ fontSize: '0.875rem' }}>
                                                {event.title}
                                            </span>
                                            {isPending && (
                                                <span className="badge bg-warning text-dark" style={{ fontSize: '0.65rem' }}>Pending</span>
                                            )}
                                            {isApproved && (
                                                <span className="badge bg-success" style={{ fontSize: '0.65rem' }}>Approved</span>
                                            )}
                                        </div>

                                        {event.description && (
                                            <p className="mb-0 text-secondary fst-italic text-truncate small">
                                                {event.description}
                                            </p>
                                        )}

                                        <div className="d-flex align-items-center gap-2 mt-1 flex-wrap">
                                            {(userRole === 'teacher' || userRole === 'admin') && staffNames.length > 0 && (
                                                <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                    {staffNames.join(', ')}
                                                </span>
                                            )}
                                            {event.students?.length > 0 && (
                                                <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                    {(userRole === 'teacher' || userRole === 'admin') && staffNames.length > 0 && '·'} {event.students.length} student{event.students.length !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventsList;
