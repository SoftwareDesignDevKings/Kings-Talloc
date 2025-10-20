import React from 'react';
import { FiCalendar } from '@/components/icons';
import { format } from 'date-fns';

const EventsList = ({ events, title, emptyMessage, userRole, isToday = false }) => {
  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white border-bottom">
        <h5 className="mb-0 fw-semibold">{title}</h5>
      </div>
      <div className="card-body">
        {events.length === 0 ? (
          <div className="text-center py-5">
            <FiCalendar className="text-muted mb-3" size={48} />
            <p className="text-muted mb-0">{emptyMessage}</p>
          </div>
        ) : (
          <div className="list-group list-group-flush">
            {events.map((event, index) => (
              <div key={event.id} className={`list-group-item border-0 px-0 ${index === 0 ? 'pt-0 pb-3' : 'py-3'}`}>
                <div className="d-flex align-items-start">
                  <div className="flex-shrink-0 me-3">
                    <div className={`${isToday ? 'bg-success' : 'bg-primary'} bg-opacity-10 rounded p-3 text-center`} style={{ minWidth: '70px' }}>
                      <div className={`fw-semibold ${isToday ? 'text-success' : 'text-primary'}`}>
                        {isToday ? 'Today' : format(new Date(event.start), 'MMM d')}
                      </div>
                      <div className="small text-muted">
                        {format(new Date(event.start), 'h:mm a')}
                      </div>
                    </div>
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="mb-1 fw-semibold">{event.title}</h6>
                    {event.description && (
                      <p className="mb-2 text-muted small">{event.description}</p>
                    )}
                    <div className="d-flex flex-wrap gap-2">
                      {event.staff && event.staff.length > 0 && (
                        <>
                          {userRole === 'teacher' ? (
                            event.staff.map((staff, idx) => (
                              <span key={idx} className="badge bg-secondary">
                                {staff.label || staff.value}
                              </span>
                            ))
                          ) : (
                            <span className="badge bg-secondary">
                              {event.staff.length} Staff
                            </span>
                          )}
                        </>
                      )}
                      {event.students && event.students.length > 0 && (
                        <span className="badge bg-primary">
                          {event.students.length} Students
                        </span>
                      )}
                      {event.createdByStudent && event.approvalStatus === 'pending' && (
                        <span className="badge bg-warning text-dark">Pending Approval</span>
                      )}
                      {event.createdByStudent && event.approvalStatus === 'approved' && (
                        <span className="badge bg-success">Approved</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsList;
