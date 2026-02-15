import React, { useCallback, useState, useEffect } from 'react';
import { format, isValid } from 'date-fns';
import { MdEventNote, MdAccessTime, SiMicrosoftTeams } from '@/components/icons';

const EventDetailsSection = ({ newEvent, setNewEvent, handleInputChange, readOnly, isEditing }) => {
    const [isRecurring, setIsRecurring] = useState(!!newEvent.recurring)

    // Sync isRecurring state with newEvent.recurring changes
    useEffect(() => {
        setIsRecurring(!!newEvent.recurring)
    }, [newEvent.recurring])

    const handleOccurenceNumChange = useCallback((e) => {
        const value = parseInt(e.target.value, 10) || 0;
        setNewEvent((prev) => ({ ...prev, occurenceNum: value }));
    }, [setNewEvent]);

    const handleTeamsMeetingToggle = useCallback(() => {
        setNewEvent((prev) => ({
            ...prev,
            createTeamsMeeting: !prev.createTeamsMeeting,
        }));
    }, [setNewEvent]);

    const handleWeeklyRecurringToggle = useCallback(() => {
        setNewEvent((prev) => ({
            ...prev,
            recurring: prev.recurring === 'weekly' ? null : 'weekly',
        }));
    }, [setNewEvent]);

    const handleFortnightlyRecurringToggle = useCallback(() => {
        setNewEvent((prev) => ({
            ...prev,
            recurring: prev.recurring === 'fortnightly' ? null : 'fortnightly',
        }));
    }, [setNewEvent]);
    // Collapse by default for student requests (teacher viewing)
    const isStudentRequest = newEvent.createdByStudent;
    const isExpanded = !isStudentRequest;

    return (
        <div className="accordion-item">
            <h2 className="accordion-header">
                <button
                    className={`accordion-button ${isExpanded ? '' : 'collapsed'}`}
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#eventDetails"
                    aria-expanded={isExpanded}
                    aria-controls="eventDetails"
                >
                    <MdEventNote className="me-2" aria-hidden="true" /> Event Details
                </button>
            </h2>
            <div
                id="eventDetails"
                className={`accordion-collapse collapse ${isExpanded ? 'show' : ''}`}
                data-bs-parent="#eventFormAccordion"
            >
                <div className="accordion-body">
                    <div className="mb-3">
                        <label htmlFor="title" className="form-label small text-muted mb-1">
                            Title
                        </label>
                        <input
                            type="text"
                            className="form-control"
                            name="title"
                            id="title"
                            value={newEvent.title}
                            onChange={handleInputChange}
                            disabled={readOnly}
                            aria-label="Event title"
                            aria-required="true"
                        />
                    </div>

                    <div className="mb-3">
                        <label htmlFor="description" className="form-label small text-muted mb-1">
                            Description
                        </label>
                        <textarea
                            className="form-control"
                            rows={2}
                            name="description"
                            id="description"
                            value={newEvent.description}
                            onChange={handleInputChange}
                            disabled={readOnly}
                            aria-label="Event description"
                        />
                    </div>

                    <div className="mb-3">
                        <div className="d-flex gap-2 align-items-center flex-wrap">
                            {!readOnly && (
                                <button
                                    type="button"
                                    className={`btn d-flex align-items-center gap-2 ${newEvent.createTeamsMeeting ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={handleTeamsMeetingToggle}
                                    style={
                                        newEvent.createTeamsMeeting
                                            ? {
                                                  backgroundColor: '#5059C9',
                                                  borderColor: '#5059C9',
                                              }
                                            : { color: '#5059C9', borderColor: '#5059C9' }
                                    }
                                    aria-pressed={newEvent.createTeamsMeeting}
                                    aria-label={`${newEvent.createTeamsMeeting ? 'Remove' : 'Add'} online Teams meeting`}
                                >
                                    <SiMicrosoftTeams size={30} aria-hidden="true" />
                                    Online Teams Meeting
                                </button>
                            )}

                            {newEvent.teamsJoinUrl && (
                                <a
                                    href={newEvent.teamsJoinUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-success"
                                >
                                    Join Meeting
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-md-6">
                            <div className="mb-3">
                                <label
                                    htmlFor="start"
                                    className="form-label small text-muted mb-1 d-flex align-items-center gap-1"
                                >
                                    <MdAccessTime /> Start Time
                                </label>
                                <input
                                    type="datetime-local"
                                    className="form-control"
                                    name="start"
                                    id="start"
                                    value={
                                        newEvent.start && isValid(new Date(newEvent.start))
                                            ? format(new Date(newEvent.start), "yyyy-MM-dd'T'HH:mm")
                                            : ''
                                    }
                                    onChange={handleInputChange}
                                    required
                                    disabled={readOnly}
                                    aria-label="Event start time"
                                    aria-required="true"
                                />
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="mb-0">
                                <label
                                    htmlFor="end"
                                    className="form-label small text-muted mb-1 d-flex align-items-center gap-1"
                                >
                                    <MdAccessTime /> End Time
                                </label>
                                <input
                                    type="datetime-local"
                                    className="form-control"
                                    name="end"
                                    id="end"
                                    value={
                                        newEvent.end && isValid(new Date(newEvent.end))
                                            ? format(new Date(newEvent.end), "yyyy-MM-dd'T'HH:mm")
                                            : ''
                                    }
                                    onChange={handleInputChange}
                                    required
                                    disabled={readOnly}
                                    aria-label="Event end time"
                                    aria-required="true"
                                />
                            </div>
                        </div>
                    </div>

                    {!readOnly && (
                        <>
                            <div className="d-flex gap-2 align-items-center mt-3">
                                <small className="text-muted" id="recurring-label">
                                    Recurring:
                                </small>
                                <div
                                    className="btn-group btn-group-sm"
                                    role="group"
                                    aria-labelledby="recurring-label"
                                >
                                    <button
                                        type="button"
                                        className={`btn ${newEvent.recurring === 'weekly' ? 'btn-primary' : 'btn-outline-primary'}`}
                                        onClick={() => {
                                            handleWeeklyRecurringToggle()
                                            setIsRecurring(true)
                                        }}
                                        disabled={readOnly || (isEditing && newEvent.occurenceNum)}
                                        aria-pressed={newEvent.recurring === 'weekly'}
                                        aria-label="Repeat weekly"
                                    >
                                        Repeat Weekly
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn ${newEvent.recurring === 'fortnightly' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                        onClick={() => {
                                            handleFortnightlyRecurringToggle()
                                            setIsRecurring(true)
                                        }}
                                        disabled={readOnly || (isEditing && newEvent.occurenceNum)}
                                        aria-pressed={newEvent.recurring === 'fortnightly'}
                                        aria-label="Repeat fortnightly"
                                    >
                                        Repeat Fortnightly
                                    </button>
                                </div>
                            </div>

                            {isRecurring && !newEvent.isRecurringInstance && (
                                <div className="mt-2">
                                    {isEditing && newEvent.occurenceNum ? (
                                        <small className="text-muted d-block">
                                            <strong>Occurrences:</strong> {newEvent.eventExceptions && newEvent.eventExceptions.length > 0
                                                ? newEvent.occurenceNum - newEvent.eventExceptions.length
                                                : newEvent.occurenceNum}
                                        </small>
                                    ) : (
                                        <>
                                            <label htmlFor="occurenceNum" className="form-label small text-muted mb-1">
                                                Number of Occurrences *
                                            </label>
                                            <input
                                                type="number"
                                                className="form-control form-control-sm shadow-none w-100"
                                                name="occurenceNum"
                                                id="occurenceNum"
                                                value={newEvent.occurenceNum || ''}
                                                onChange={handleOccurenceNumChange}
                                                disabled={readOnly}
                                                aria-label="Number of Occurrences"
                                                aria-required="true"
                                                min="1"
                                                placeholder="Enter number"
                                            />
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(EventDetailsSection);
