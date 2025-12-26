import React from 'react';
import { format, isValid } from 'date-fns';
import { MdEventNote, MdAccessTime, SiMicrosoftTeams } from '@/components/icons';

const EventDetailsSection = ({ newEvent, setNewEvent, handleInputChange, readOnly }) => {
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
                                    onClick={() =>
                                        setNewEvent({
                                            ...newEvent,
                                            createTeamsMeeting: !newEvent.createTeamsMeeting,
                                        })
                                    }
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
                                    className="btn d-flex align-items-center gap-2"
                                    style={{
                                        backgroundColor: '#5059C9',
                                        borderColor: '#5059C9',
                                        color: 'white',
                                    }}
                                >
                                    <SiMicrosoftTeams size={20} aria-hidden="true" />
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
                                        setNewEvent({
                                            ...newEvent,
                                            recurring:
                                                newEvent.recurring === 'weekly' ? null : 'weekly',
                                        });
                                    }}
                                    aria-pressed={newEvent.recurring === 'weekly'}
                                    aria-label="Repeat weekly"
                                >
                                    Repeat Weekly
                                </button>
                                <button
                                    type="button"
                                    className={`btn ${newEvent.recurring === 'fortnightly' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                    onClick={() => {
                                        setNewEvent({
                                            ...newEvent,
                                            recurring:
                                                newEvent.recurring === 'fortnightly'
                                                    ? null
                                                    : 'fortnightly',
                                        });
                                    }}
                                    aria-pressed={newEvent.recurring === 'fortnightly'}
                                    aria-label="Repeat fortnightly"
                                >
                                    Repeat Fortnightly
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EventDetailsSection;
