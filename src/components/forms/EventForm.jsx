"use client";

import React, { useState } from 'react';
import { isAfter, isBefore, format } from 'date-fns';
import Select, { components } from 'react-select';
import BaseModal from '../modals/BaseModal.jsx';
import DeleteConfirmationModal from '../modals/DeleteConfirmationModal.jsx';
import { useEventForm } from '@/hooks/forms/useEventForm';
import { useEventFormData } from '@/hooks/forms/useEventFormData';
import { useEventOperations } from '@/hooks/calendar/useEventOperations';
import { MdEventNote, MdPeople, MdSettings, MdNoteAlt, MdAccessTime, MdSchool, MdMenuBook, MdFlag, FaChalkboardTeacher, FaUserGraduate, SiMicrosoftTeams } from '@/components/icons';
import useAlert from '@/hooks/useAlert';

const EventForm = ({ isEditing, newEvent, setNewEvent, eventToEdit, setShowModal, eventsData }) => {
  const [selectedStaff, setSelectedStaff] = useState(newEvent.staff || []);
  const [selectedClasses, setSelectedClasses] = useState(newEvent.classes || []);
  const [selectedStudents, setSelectedStudents] = useState(newEvent.students || []);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { setAlertMessage, setAlertType } = useAlert();

  // Use specialized hooks
  const eventForm = useEventForm(eventsData);
  const { handleDeleteEvent } = useEventOperations(eventsData);

  // Fetch form data using custom hook
  const { staffOptions, classOptions, studentOptions } = useEventFormData(newEvent);

  // Get handlers from the hook
  const handleInputChange = eventForm.handleInputChange(newEvent, setNewEvent);
  const handleStaffChange = eventForm.handleStaffChange(newEvent, setNewEvent);
  const handleClassChange = eventForm.handleClassChange(newEvent, setNewEvent);
  const handleStudentChange = eventForm.handleStudentChange(newEvent, setNewEvent);

  const handleStaffSelectChange = (selectedOptions) => {
    setSelectedStaff(selectedOptions);
    handleStaffChange(selectedOptions);
  };

  const handleClassSelectChange = (selectedOptions) => {
    setSelectedClasses(selectedOptions);
    handleClassChange(selectedOptions);
  };

  const handleStudentSelectChange = (selectedOptions) => {
    setSelectedStudents(selectedOptions);
    handleStudentChange(selectedOptions);
  };

  const handleMinStudentsChange = (e) => {
    setNewEvent({ ...newEvent, minStudents: parseInt(e.target.value, 10) });
  };

  const handleApprovalChange = (selectedOption) => {
    const approvalStatus = selectedOption.value;
    setNewEvent({ ...newEvent, approvalStatus });
  };

  const validateDates = () => {
    const start = new Date(newEvent.start);
    const end = new Date(newEvent.end);
    if (!isAfter(end, start)) {
      setAlertType('error');
      setAlertMessage('End date must be after the start date.');
      return false;
    }
    return true;
  };

  const validateForm = () => {
    // Validate dates first
    if (!validateDates()) {
      return false;
    }

    // Validate staff is not empty
    if (!newEvent.staff || newEvent.staff.length === 0) {
      setAlertType('error');
      setAlertMessage('At least one tutor must be assigned to the event.');
      return false;
    }

    return true;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      eventForm.handleSubmit(newEvent, isEditing, eventToEdit, setShowModal)(e);
    }
  };

  const handleDelete = () => {
    // Check if this is a recurring event
    const isRecurring = eventToEdit.recurring || eventToEdit.isRecurringInstance;
    const isOriginal = eventToEdit.recurring && !eventToEdit.isRecurringInstance;

    if (isRecurring) {
      // Show confirmation modal for recurring events
      setShowDeleteConfirm(true);
    } else {
      // Delete non-recurring event directly
      handleDeleteEvent(eventToEdit, { setShowTeacherModal: setShowModal, setShowStudentModal: () => {}, setShowAvailabilityModal: () => {} });
      setShowModal(false);
    }
  };

  const handleConfirmDelete = (deleteOption) => {
    handleDeleteEvent(eventToEdit, { setShowTeacherModal: setShowModal, setShowStudentModal: () => {}, setShowAvailabilityModal: () => {} }, deleteOption);
    setShowDeleteConfirm(false);
    setShowModal(false);
  };

  const approvalOptions = [
    { value: 'approved', label: 'Approve' },
    { value: 'denied', label: 'Deny' },
  ];

  const workStatusOptions = [
    { value: 'notCompleted', label: 'Not Completed' },
    { value: 'completed', label: 'Completed' },
    { value: 'notAttended', label: "Student Didn't Attend" },
  ];

  const workTypeOptions = [
    { value: 'tutoring', label: 'Tutoring' },
    { value: 'coaching', label: 'Coaching' },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'onsite':
        return '🏫';
      case 'remote':
        return '💻';
      case 'unavailable':
        return '❌';
      default:
        return '❔';
    }
  };

  const customOption = (props) => {
    const { data } = props;
    return (
      <components.Option {...props}>
        <span>{getStatusIcon(data.status)}</span> {data.label}
      </components.Option>
    );
  };

  const customSingleValue = (props) => {
    const { data } = props;
    return (
      <components.SingleValue {...props}>
        <span>{getStatusIcon(data.status)}</span> {data.label}
      </components.SingleValue>
    );
  };

  return (
    <>
    <BaseModal
        show={!showDeleteConfirm}
        onHide={() => setShowModal(false)}
        title={isEditing ? 'Edit Event' : 'Add New Event'}
        size="lg"
        onSubmit={onSubmit}
        submitText={isEditing ? 'Save Changes' : 'Add Event'}
        deleteButton={isEditing ? {
          text: "Delete",
          onClick: handleDelete,
          variant: "danger"
        } : null}
      >
        <div className="accordion" id="eventFormAccordion">
          {/* Event Details Section */}
          <div className="accordion-item">
            <h2 className="accordion-header">
              <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#eventDetails" aria-expanded="true">
                <MdEventNote className="me-2" /> Event Details
              </button>
            </h2>
            <div id="eventDetails" className="accordion-collapse collapse show" data-bs-parent="#eventFormAccordion">
              <div className="accordion-body">
                <div className="mb-3">
                  <label htmlFor="title" className="form-label small text-muted mb-1">Title</label>
                  <input
                    type="text"
                    className="form-control"
                    name="title"
                    id="title"
                    value={newEvent.title}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="description" className="form-label small text-muted mb-1">Description</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    name="description"
                    id="description"
                    value={newEvent.description}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="mb-3">
                  <button
                    type="button"
                    className={`btn d-flex align-items-center gap-2 ${newEvent.createTeamsMeeting ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setNewEvent({ ...newEvent, createTeamsMeeting: !newEvent.createTeamsMeeting })}
                    style={newEvent.createTeamsMeeting ? { backgroundColor: '#5059C9', borderColor: '#5059C9' } : { color: '#5059C9', borderColor: '#5059C9' }}
                  >
                    <SiMicrosoftTeams size={30} />
                    Create Online Teams Meeting
                  </button>
                </div>

                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label htmlFor="start" className="form-label small text-muted mb-1 d-flex align-items-center gap-1">
                        <MdAccessTime /> Start Time
                      </label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        name="start"
                        id="start"
                        value={format(new Date(newEvent.start), "yyyy-MM-dd'T'HH:mm")}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-0">
                      <label htmlFor="end" className="form-label small text-muted mb-1 d-flex align-items-center gap-1">
                        <MdAccessTime /> End Time
                      </label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        name="end"
                        id="end"
                        value={format(new Date(newEvent.end), "yyyy-MM-dd'T'HH:mm")}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="d-flex gap-2 align-items-center mt-3">
                  <small className="text-muted">Recurring:</small>
                  <div className="btn-group btn-group-sm" role="group">
                    <button
                      type="button"
                      className={`btn ${newEvent.recurring === 'weekly' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => {
                        setNewEvent({ ...newEvent, recurring: newEvent.recurring === 'weekly' ? null : 'weekly' });
                      }}
                    >
                      Repeat Weekly
                    </button>
                    <button
                      type="button"
                      className={`btn ${newEvent.recurring === 'fortnightly' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                      onClick={() => {
                        setNewEvent({ ...newEvent, recurring: newEvent.recurring === 'fortnightly' ? null : 'fortnightly' });
                      }}
                    >
                      Repeat Fortnightly
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Participants Section */}
          <div className="accordion-item">
            <h2 className="accordion-header">
              <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#participants" aria-expanded="false">
                <MdPeople className="me-2" /> Participants
              </button>
            </h2>
            <div id="participants" className="accordion-collapse collapse" data-bs-parent="#eventFormAccordion">
              <div className="accordion-body">
                <div className="mb-3">
                  <label htmlFor="staff" className="form-label small text-muted mb-1 d-flex align-items-center gap-1">
                    <FaChalkboardTeacher /> Assign Tutor
                  </label>
                  <Select
                    isMulti
                    name="tutor"
                    options={staffOptions}
                    value={selectedStaff}
                    onChange={handleStaffSelectChange}
                    classNamePrefix="select"
                    components={{ Option: customOption, SingleValue: customSingleValue }}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="classes" className="form-label small text-muted mb-1 d-flex align-items-center gap-1">
                    <MdSchool /> Assign Classes
                  </label>
                  <Select
                    isMulti
                    name="classes"
                    options={classOptions}
                    value={selectedClasses}
                    onChange={handleClassSelectChange}
                    classNamePrefix="select"
                  />
                </div>

                <div className="mb-0">
                  <label htmlFor="students" className="form-label small text-muted mb-1 d-flex align-items-center gap-1">
                    <FaUserGraduate /> Assign Students
                  </label>
                  <Select
                    isMulti
                    name="students"
                    options={studentOptions}
                    value={selectedStudents}
                    onChange={handleStudentSelectChange}
                    classNamePrefix="select"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Settings & Status Section */}
          <div className="accordion-item">
            <h2 className="accordion-header">
              <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#settings" aria-expanded="false">
                <MdSettings className="me-2" /> Settings & Status
              </button>
            </h2>
            <div id="settings" className="accordion-collapse collapse" data-bs-parent="#eventFormAccordion">
              <div className="accordion-body">
                <div className="mb-3">
                  <label htmlFor="minStudents" className="form-label small text-muted mb-1">Minimum Students Required</label>
                  <input
                    type="number"
                    className="form-control"
                    name="minStudents"
                    id="minStudents"
                    value={newEvent.minStudents || 0}
                    onChange={handleMinStudentsChange}
                  />
                </div>

                {newEvent.minStudents > 0 && (
                  <div className="mb-3">
                    <small className="text-muted d-block mb-2">Student Responses</small>
                    {newEvent.studentResponses && newEvent.studentResponses.length > 0 ? (
                      <div className="d-flex flex-wrap gap-1">
                        {newEvent.studentResponses.map((response, index) => (
                          <span
                            key={index}
                            className={`badge bg-${response.response ? 'success' : 'danger'} fw-normal`}
                          >
                            {response.email}: {response.response ? 'Accepted' : 'Declined'}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted mb-0 small fst-italic">No responses yet</p>
                    )}
                  </div>
                )}

                <div className="mb-3">
                  <label htmlFor="workType" className="form-label small text-muted mb-1">Work Type</label>
                  <Select
                    name="workType"
                    options={workTypeOptions}
                    onChange={(selectedOption) =>
                      setNewEvent({ ...newEvent, workType: selectedOption.value })
                    }
                    classNamePrefix="select"
                    value={workTypeOptions.find(
                      option => option.value === (newEvent.workType || 'tutoring')
                    )}
                  />
                </div>

                <div className="mb-0">
                  <label htmlFor="workStatus" className="form-label small text-muted mb-1">Work Status</label>
                  <Select
                    name="workStatus"
                    options={workStatusOptions}
                    onChange={(selectedOption) =>
                      setNewEvent({ ...newEvent, workStatus: selectedOption.value })
                    }
                    classNamePrefix="select"
                    value={workStatusOptions.find(
                      option => option.value === (newEvent.workStatus || 'notCompleted')
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Student Request Section */}
          {newEvent.createdByStudent && (
            <div className="accordion-item">
              <h2 className="accordion-header">
                <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#studentRequest" aria-expanded="false">
                  <MdNoteAlt className="me-2" /> Student Request
                </button>
              </h2>
              <div id="studentRequest" className="accordion-collapse collapse" data-bs-parent="#eventFormAccordion">
                <div className="accordion-body">
                  {newEvent.subject && (
                    <div className="mb-2">
                      <small className="text-muted d-block mb-1 d-flex align-items-center gap-1">
                        <MdMenuBook /> Subject
                      </small>
                      <span className="badge bg-secondary fw-normal">
                        {newEvent.subject.label || newEvent.subject}
                      </span>
                    </div>
                  )}

                  {newEvent.preference && (
                    <div className="mb-3">
                      <small className="text-muted d-block mb-1 d-flex align-items-center gap-1">
                        <MdFlag /> Preference
                      </small>
                      <span className="badge bg-primary fw-normal">
                        {newEvent.preference}
                      </span>
                    </div>
                  )}

                  <div className="mb-0">
                    <label htmlFor="approvalStatus" className="form-label small text-muted mb-1">Approval Status</label>
                    <Select
                      name="approvalStatus"
                      options={approvalOptions}
                      onChange={handleApprovalChange}
                      classNamePrefix="select"
                      defaultValue={
                        newEvent.approvalStatus === 'approved'
                          ? { value: 'approved', label: 'Approve' }
                          : newEvent.approvalStatus === 'denied'
                          ? { value: 'denied', label: 'Deny' }
                          : null
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
    </BaseModal>

    <DeleteConfirmationModal
      show={showDeleteConfirm}
      onHide={() => setShowDeleteConfirm(false)}
      onConfirm={handleConfirmDelete}
      isRecurring={eventToEdit?.recurring || eventToEdit?.isRecurringInstance}
      isOriginal={eventToEdit?.recurring && !eventToEdit?.isRecurringInstance}
    />
    </>
  );
};

export default EventForm;
