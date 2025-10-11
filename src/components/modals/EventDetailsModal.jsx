"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import Select from 'react-select';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firestore/clientFirestore.js';
import { MdEventNote, MdPeople, MdSchool, MdAccessTime, MdNoteAlt, MdMenuBook, MdFlag, MdEdit, FaChalkboardTeacher, FaUserGraduate } from '@/components/icons';

const EventDetailsModal = ({ event, onClose, userEmail, userRole, events, setEvents }) => {
  console.log('EventDetailsModal - event:', event);
  console.log('createdByStudent:', event.createdByStudent);
  console.log('subject:', event.subject);
  console.log('preference:', event.preference);

  const offcanvasRef = useRef(null);
  const onCloseRef = useRef(onClose);

  // Keep ref updated
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const studentResponse = event.studentResponses?.find(response => response.email === userEmail);
  const [response, setResponse] = useState(studentResponse ? (studentResponse.response ? 'accepted' : 'declined') : '');
  const [workStatus, setWorkStatus] = useState(event.workStatus || 'notCompleted');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleResponseChange = (selectedOption) => {
    setResponse(selectedOption.value);
    setHasChanges(true);
  };

  const handleWorkStatusChange = (selectedOption) => {
    setWorkStatus(selectedOption.value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!hasChanges) {
      onCloseRef.current();
      return;
    }

    setIsSaving(true);
    try {
      const updateData = {};

      // Update student response if changed
      if (userRole === 'student' && event.minStudents > 0) {
        const isAccepted = response === 'accepted';
        const updatedStudentResponses = [
          ...(event.studentResponses || []).filter(resp => resp.email !== userEmail),
          { email: userEmail, response: isAccepted },
        ];
        updateData.studentResponses = updatedStudentResponses;
      }

      // Update work status if changed
      if (userRole === 'tutor' && workStatus !== event.workStatus) {
        updateData.workStatus = workStatus;
      }

      // Save to Firebase
      const eventDoc = doc(db, 'events', event.id);
      await updateDoc(eventDoc, updateData);

      // Update local state
      const updatedEvent = { ...event, ...updateData };
      setEvents(events.map(evt => (evt.id === event.id ? updatedEvent : evt)));

      onCloseRef.current();
    } catch (error) {
      console.error('Failed to save changes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const workStatusOptions = [
    { value: 'notCompleted', label: 'Not Completed' },
    { value: 'completed', label: 'Completed' },
    { value: 'notAttended', label: "Student Didn't Attend" },
  ];

  // Handle offcanvas visibility - only runs once on mount
  useEffect(() => {
    if (!offcanvasRef.current) return;

    const element = offcanvasRef.current;
    const handleHidden = () => onCloseRef.current();

    // Initialize and show
    const offcanvas = window.bootstrap?.Offcanvas?.getOrCreateInstance(element, {
      backdrop: true,
      keyboard: true,
      scroll: false
    });

    element.addEventListener('hidden.bs.offcanvas', handleHidden);
    offcanvas?.show();

    // Cleanup
    return () => {
      element.removeEventListener('hidden.bs.offcanvas', handleHidden);
      offcanvas?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={offcanvasRef} className="offcanvas offcanvas-end tw-w-[480px] tw-max-w-[90vw]" tabIndex="-1" id="eventDetailsOffcanvas" data-bs-backdrop="true">
      <div className="offcanvas-header bg-light border-bottom">
        <h5 className="offcanvas-title fw-semibold">Event Details</h5>
        <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>

      <div className="offcanvas-body p-3 d-flex flex-column">
          {/* Event Information Card */}
          <div className="card mb-3 border-0 shadow-sm">
            <div className="card-header bg-secondary text-white py-2">
              <h6 className="mb-0 d-flex align-items-center gap-2">
                <MdEventNote className="fs-5" /> Event Information
              </h6>
            </div>
            <div className="card-body p-3">
              <div className="mb-3">
                <small className="text-muted d-block mb-1">Title</small>
                <h5 className="mb-0">{event.title}</h5>
              </div>

              {event.description && (
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Description</small>
                  <p className="mb-0">{event.description}</p>
                </div>
              )}

              <div className="row">
                <div className="col-md-6">
                  <small className="text-muted d-block mb-1 d-flex align-items-center gap-1">
                    <MdAccessTime /> Start Time
                  </small>
                  <div className="fw-medium">{format(new Date(event.start), 'MMM d, yyyy h:mm a')}</div>
                </div>
                <div className="col-md-6">
                  <small className="text-muted d-block mb-1 d-flex align-items-center gap-1">
                    <MdAccessTime /> End Time
                  </small>
                  <div className="fw-medium">{format(new Date(event.end), 'MMM d, yyyy h:mm a')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Participants Card */}
          <div className="card mb-3 border-0 shadow-sm">
            <div className="card-header bg-success text-white py-2">
              <h6 className="mb-0 d-flex align-items-center gap-2">
                <MdPeople className="fs-5" /> Participants
              </h6>
            </div>
            <div className="card-body p-3">
              {event.staff && event.staff.length > 0 && (
                <div className="mb-3">
                  <small className="text-muted d-block mb-2 d-flex align-items-center gap-1">
                    <FaChalkboardTeacher /> Staff
                  </small>
                  <div className="d-flex flex-wrap gap-1">
                    {event.staff.map((staff, idx) => (
                      <span key={idx} className="badge bg-secondary fw-normal">
                        {staff.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {event.classes && event.classes.length > 0 && (
                <div className="mb-3">
                  <small className="text-muted d-block mb-2 d-flex align-items-center gap-1">
                    <MdSchool /> Classes
                  </small>
                  <div className="d-flex flex-wrap gap-1">
                    {event.classes.map((cls, idx) => (
                      <span key={idx} className="badge bg-success fw-normal">
                        {cls.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {event.students && event.students.length > 0 && (
                <div>
                  <small className="text-muted d-block mb-2 d-flex align-items-center gap-1">
                    <FaUserGraduate /> Students
                  </small>
                  <div className="d-flex flex-wrap gap-1">
                    {event.students.map((student, idx) => (
                      <span key={idx} className="badge bg-primary fw-normal">
                        {student.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Student Request Info Card */}
          {(event.createdByStudent || event.isStudentRequest) && (event.subject || event.preference) && (
            <div className="card mb-3 border-0 shadow-sm">
              <div className="card-header bg-secondary text-white py-2">
                <h6 className="mb-0 d-flex align-items-center gap-2">
                  <MdNoteAlt className="fs-5" /> Student Request Details
                </h6>
              </div>
              <div className="card-body p-3">
                {event.subject && (
                  <div className="mb-2">
                    <small className="text-muted d-block mb-1 d-flex align-items-center gap-1">
                      <MdMenuBook /> Subject
                    </small>
                    <span className="badge bg-dark fw-normal">
                      {typeof event.subject === 'object' ? event.subject.label : event.subject}
                    </span>
                  </div>
                )}

                {event.preference && (
                  <div>
                    <small className="text-muted d-block mb-1 d-flex align-items-center gap-1">
                      <MdFlag /> Preference
                    </small>
                    <span className="badge bg-primary fw-normal">
                      {event.preference}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions Card */}
          {(userRole === 'student' && event.minStudents > 0) || userRole === 'tutor' ? (
            <div className="card mb-0 border-0 shadow-sm">
              <div className="card-header bg-info text-white py-2">
                <h6 className="mb-0 d-flex align-items-center gap-2">
                  <MdEdit className="fs-5" /> Your Response
                </h6>
              </div>
              <div className="card-body p-3">
                {userRole === 'student' && event.minStudents > 0 && (
                  <div className="mb-3">
                    <label className="form-label small text-muted mb-1">Your Attendance</label>
                    <Select
                      name="userResponse"
                      options={[
                        { value: 'accepted', label: 'Accept' },
                        { value: 'declined', label: 'Decline' },
                      ]}
                      value={response ? { value: response, label: response.charAt(0).toUpperCase() + response.slice(1) } : null}
                      onChange={handleResponseChange}
                      className="basic-single-select"
                      classNamePrefix="select"
                    />
                  </div>
                )}

                {userRole === 'tutor' && (
                  <div className="mb-3">
                    <label className="form-label small text-muted mb-1">Work Status</label>
                    <Select
                      name="workStatus"
                      options={workStatusOptions}
                      value={workStatusOptions.find(option => option.value === workStatus)}
                      onChange={handleWorkStatusChange}
                      classNamePrefix="select"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : null}

        {/* Footer */}
        <div className="mt-auto border-top p-3 bg-light">
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => onCloseRef.current()} disabled={isSaving}>
              Cancel
            </button>
            {hasChanges && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsModal;
