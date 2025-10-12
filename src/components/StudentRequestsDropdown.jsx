"use client";

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '@/firestore/clientFirestore.js';
import { FiChevronDown, FiCheck, FiX } from '@/components/icons';
import { format } from 'date-fns';

const StudentRequestsDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const studentEventReqRef = collection(db, 'studentEventRequests');
      const studentEventSnapshot = await getDocs(studentEventReqRef);

      const pendingRequests = studentEventSnapshot.docs
        .filter(doc => doc.data().approvalStatus === "pending")
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          start: doc.data().start?.toDate ? doc.data().start.toDate() : new Date(doc.data().start),
          end: doc.data().end?.toDate ? doc.data().end.toDate() : new Date(doc.data().end)
        }));

      setRequests(pendingRequests);
    } catch (error) {
      console.error('Error fetching student requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen]);

  const handleApprove = async (requestId) => {
    try {
      // Find the request
      const request = requests.find(req => req.id === requestId);
      if (!request) return;

      // Delete from studentEventRequests
      const requestRef = doc(db, 'studentEventRequests', requestId);
      await deleteDoc(requestRef);

      // Create in events collection as a normal event
      const eventData = {
        title: request.title,
        description: request.description || "",
        start: request.start,
        end: request.end,
        students: request.students,
        staff: request.staff,
        subject: request.subject,
        location: request.location,
        workType: request.workType,
        workStatus: 'notCompleted',
        createdByStudent: true,
        approvalStatus: 'approved',
        approvedAt: new Date(),
        createdAt: request.createdAt || new Date(),
        confirmationRequired: false,
        minStudents: 0,
        studentResponses: [],
        tutorResponses: [],
        classes: request.classes
      };

      const eventsRef = collection(db, 'events');
      await addDoc(eventsRef, eventData);

      setRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleReject = async (requestId) => {
    try {
      const requestRef = doc(db, 'studentEventRequests', requestId);
      await updateDoc(requestRef, {
        approvalStatus: 'rejected',
        rejectedAt: new Date()
      });

      setRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  return (
    <div className="dropdown">
      <button
        className="btn btn-warning position-relative"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        Pending Approvals
        {requests.length > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
            {requests.length}
          </span>
        )}
        <FiChevronDown className="ms-2" />
      </button>

      {isOpen && (
        <div className="dropdown-menu show" style={{ minWidth: '400px', maxHeight: '500px', overflowY: 'auto' }}>
          {loading ? (
            <div className="dropdown-item text-center">
              <div className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : requests.length === 0 ? (
            <div className="dropdown-item text-muted text-center">
              No pending requests
            </div>
          ) : (
            requests.map((request) => (
              <div key={request.id} className="dropdown-item-text border-bottom">
                <div className="d-flex flex-column gap-2 py-2">
                  <div>
                    <strong>{request.title || 'Untitled Request'}</strong>
                    {request.studentName && (
                      <div className="small text-muted">{request.studentName}</div>
                    )}
                  </div>

                  <div className="small">
                    <div className="text-muted">
                      {format(request.start, 'MMM d, yyyy h:mm a')} - {format(request.end, 'h:mm a')}
                    </div>
                    {request.subject && (
                      <div className="text-muted">
                        Subject: {typeof request.subject === 'string' ? request.subject : request.subject.label}
                      </div>
                    )}
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => handleApprove(request.id)}
                    >
                      <FiCheck className="me-1" />
                      Approve
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleReject(request.id)}
                    >
                      <FiX className="me-1" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default StudentRequestsDropdown;
