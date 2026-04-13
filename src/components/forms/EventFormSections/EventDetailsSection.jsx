import React, { useCallback, useState, useEffect } from 'react';
import { format, isValid } from 'date-fns';
import { MdEventNote, MdAccessTime, SiMicrosoftTeams } from '@/components/icons';
import styles from '@/styles/availabilityForm.module.css';

const EventDetailsSection = ({ newEvent, setNewEvent, handleInputChange, readOnly, isEditing, errors = {} }) => {
    const [isRecurring, setIsRecurring] = useState(!!newEvent.recurring)
    const [initialOccurenceNum, setInitialOccurenceNum] = useState(newEvent.occurenceNum);

    // Capture the occurenceNum once when it first arrives from the parent (async hydration)
    // so typing a new value doesn't collapse the input back to static text
    useEffect(() => {
        if (newEvent.occurenceNum && !initialOccurenceNum) {
            setInitialOccurenceNum(newEvent.occurenceNum);
        }
    }, [newEvent.occurenceNum, initialOccurenceNum]);

    // Sync isRecurring state with newEvent.recurring changes
    useEffect(() => {
        setIsRecurring(!!newEvent.recurring)
    }, [newEvent.recurring])

    const handleOccurenceNumChange = useCallback((e) => {
        // Store raw string while typing so "10" isn't truncated to "1"
        setNewEvent((prev) => ({ ...prev, occurenceNum: e.target.value }));
    }, [setNewEvent]);

    const handleOccurenceNumBlur = useCallback((e) => {
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
        <div className="accordion-item border-0 border-bottom">
            <h2 className="accordion-header">
                <button
                    className={`accordion-button shadow-none ${isExpanded ? '' : 'collapsed'}`}
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#eventDetails"
                    aria-expanded={isExpanded}
                    aria-controls="eventDetails"
                    style={{ background: 'transparent' }}
                >
                    <div className="d-flex align-items-center justify-content-between w-100 me-3">
                        <div className="d-flex align-items-center">
                            <MdEventNote className="me-2 text-primary" size={20} aria-hidden="true" />
                            <span className="fw-bold">General Information</span>
                        </div>
                        {newEvent.createTeamsMeeting && (
                            <SiMicrosoftTeams className="text-tks-secondary" size={18} title="Teams Meeting Enabled" />
                        )}
                    </div>
                </button>
            </h2>
            <div
                id="eventDetails"
                className={`accordion-collapse collapse ${isExpanded ? 'show' : ''}`}
                data-bs-parent="#eventFormAccordion"
            >
                <div className="accordion-body p-4">
                    <div className="mb-4">
                        <label htmlFor="title" className="form-label small fw-bold text-muted text-uppercase">
                            Event Title
                        </label>
                        <input
                            type="text"
                            className={`form-control form-control-lg border-0 bg-light ${errors.title ? 'is-invalid' : ''}`}
                            name="title"
                            id="title"
                            placeholder="e.g. Weekly Math Tutoring"
                            value={newEvent.title}
                            onChange={handleInputChange}
                            disabled={readOnly}
                            aria-label="Event title"
                            aria-required="true"
                        />
                        {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                    </div>

                    <div className="mb-4">
                        <label htmlFor="description" className="form-label small fw-bold text-muted text-uppercase">
                            Description (Optional)
                        </label>
                        <textarea
                            className="form-control border-0 bg-light"
                            rows={2}
                            name="description"
                            id="description"
                            placeholder="Add any notes or context..."
                            value={newEvent.description}
                            onChange={handleInputChange}
                            disabled={readOnly}
                            aria-label="Event description"
                        />
                    </div>

                    <div className="row g-3 mb-4">
                        <div className="col-md-6">
                            <label
                                htmlFor="start"
                                className="form-label small fw-bold text-muted text-uppercase d-flex align-items-center gap-1"
                            >
                                <MdAccessTime /> Start Time
                            </label>
                            <input
                                type="datetime-local"
                                className={`form-control border-0 bg-light ${errors.dates ? 'is-invalid' : ''}`}
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
                        <div className="col-md-6">
                            <label
                                htmlFor="end"
                                className="form-label small fw-bold text-muted text-uppercase d-flex align-items-center gap-1"
                            >
                                <MdAccessTime /> End Time
                            </label>
                            <input
                                type="datetime-local"
                                className={`form-control border-0 bg-light ${errors.dates ? 'is-invalid' : ''}`}
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
                        {errors.dates && <div className="col-12 text-danger small mt-1">{errors.dates}</div>}
                    </div>

                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 pt-3 border-top">
                        {!readOnly && (
                            <div className="d-flex align-items-center gap-3">
                                <button
                                    type="button"
                                    className={`btn d-flex align-items-center gap-2 ${newEvent.createTeamsMeeting ? styles.teamsButton : styles.teamsButtonOutline} ${newEvent.createTeamsMeeting ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={handleTeamsMeetingToggle}
                                    aria-pressed={newEvent.createTeamsMeeting}
                                    aria-label={`${newEvent.createTeamsMeeting ? 'Remove' : 'Add'} online Teams meeting`}
                                >
                                    <SiMicrosoftTeams size={24} aria-hidden="true" />
                                    <span>{newEvent.createTeamsMeeting ? 'Teams Meeting Enabled' : 'Add Teams Meeting'}</span>
                                </button>
                            </div>
                        )}

                        {newEvent.teamsJoinUrl && (
                            <a
                                href={newEvent.teamsJoinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-success d-flex align-items-center gap-2"
                            >
                                <SiMicrosoftTeams size={18} /> Join Now
                            </a>
                        )}

                        {!readOnly && (
                            <div className="d-flex align-items-center gap-2 ms-auto">
                                <small className="text-muted fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>Recurrence:</small>
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
                                        disabled={readOnly || isEditing}
                                        aria-pressed={newEvent.recurring === 'weekly'}
                                    >
                                        Weekly
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn ${newEvent.recurring === 'fortnightly' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                        onClick={() => {
                                            handleFortnightlyRecurringToggle()
                                            setIsRecurring(true)
                                        }}
                                        disabled={readOnly || isEditing}
                                        aria-pressed={newEvent.recurring === 'fortnightly'}
                                    >
                                        Fortnightly
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    {errors.recurring && <div className="text-danger text-end small mt-1">{errors.recurring}</div>}

                    {isRecurring && !newEvent.isRecurringInstance && !readOnly && (
                        <div className="mt-3 p-3 bg-light rounded d-flex align-items-center justify-content-between">
                            {isEditing && initialOccurenceNum ? (
                                <div className="small text-muted">
                                    <span className="fw-bold">Active Occurrences:</span> {newEvent.eventExceptions && newEvent.eventExceptions.length > 0
                                        ? newEvent.occurenceNum - newEvent.eventExceptions.length
                                        : newEvent.occurenceNum}
                                </div>
                            ) : (
                                <>
                                    <label htmlFor="occurenceNum" className="form-label small fw-bold text-muted text-uppercase mb-0 me-3">
                                        Occurrences *
                                    </label>
                                    <input
                                        type="number"
                                        className={`form-control form-control-sm w-auto ${errors.occurenceNum ? 'is-invalid' : ''}`}
                                        name="occurenceNum"
                                        id="occurenceNum"
                                        style={{ maxWidth: '100px' }}
                                        value={newEvent.occurenceNum || ''}
                                        onChange={handleOccurenceNumChange}
                                        onBlur={handleOccurenceNumBlur}
                                        disabled={readOnly}
                                        min="2"
                                        placeholder="Min 2"
                                    />
                                    {errors.occurenceNum && <div className="invalid-feedback ms-2">{errors.occurenceNum}</div>}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(EventDetailsSection);
