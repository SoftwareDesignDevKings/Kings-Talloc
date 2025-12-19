'use client';

import React from 'react';

import { CalendarFlow } from '@/strategy/calendarStrategy';

import EventForm from '@/components/forms/EventForm.jsx';
import TutorAvailabilityForm from '@/components/forms/TutorAvailabilityForm.jsx';
import StudentEventForm from '@/components/forms/StudentEventForm.jsx';

const CalendarRenderModals = ({ action, target, onClose, updateTarget, eventsData, studentEmail }) => {
    if (!action || !target) return null;

    const setNewEvent = (updates) => updateTarget(updates);
    const setNewAvailability = (updates) => updateTarget(updates);

    switch (action) {
        /* ───────────── SHIFTS ───────────── */

        case CalendarFlow.CREATE_SHIFT:
            return (
                <EventForm
                    mode="create"
                    newEvent={target}
                    setNewEvent={setNewEvent}
                    setShowModal={onClose}
                    eventsData={eventsData}
                />
            );

        case CalendarFlow.EDIT_SHIFT:
            return (
                <EventForm
                    mode="edit"
                    newEvent={target}
                    eventToEdit={target}
                    setNewEvent={setNewEvent}
                    setShowModal={onClose}
                    eventsData={eventsData}
                />
            );

        case CalendarFlow.VIEW_SHIFT:
            return (
                <EventForm
                    mode="view"
                    newEvent={target}
                    eventToEdit={target}
                    setNewEvent={setNewEvent}
                    setShowModal={onClose}
                    eventsData={eventsData}
                />
            );

        /* ───────────── AVAILABILITIES ───────────── */

        case CalendarFlow.CREATE_AVAILABILITY:
            return (
                <TutorAvailabilityForm
                    mode="create"
                    newAvailability={target}
                    setNewAvailability={setNewAvailability}
                    setShowModal={onClose}
                    eventsData={eventsData}
                />
            );

        case CalendarFlow.EDIT_AVAILABILITY:
            return (
                <TutorAvailabilityForm
                    mode="edit"
                    newAvailability={target}
                    eventToEdit={target}
                    setNewAvailability={setNewAvailability}
                    setShowModal={onClose}
                    eventsData={eventsData}
                />
            );

        case CalendarFlow.VIEW_AVAILABILITY:
            return (
                <TutorAvailabilityForm
                    mode="view"
                    newAvailability={target}
                    eventToEdit={target}
                    setNewAvailability={setNewAvailability}
                    setShowModal={onClose}
                    eventsData={eventsData}
                />
            );

        /* ───────────── STUDENT REQUESTS ───────────── */

        case CalendarFlow.CREATE_STUDENT_REQUEST:
            return (
                <StudentEventForm
                    mode="create"
                    newEvent={target}
                    setNewEvent={setNewEvent}
                    setShowStudentModal={onClose}
                    eventsData={eventsData}
                    studentEmail={studentEmail}
                />
            );

        case CalendarFlow.EDIT_STUDENT_REQUEST:
            return (
                <StudentEventForm
                    mode="edit"
                    newEvent={target}
                    eventToEdit={target}
                    setNewEvent={setNewEvent}
                    setShowStudentModal={onClose}
                    eventsData={eventsData}
                    studentEmail={studentEmail}
                />
            );

        case CalendarFlow.VIEW_STUDENT_REQUEST:
            return (
                <StudentEventForm
                    mode="view"
                    newEvent={target}
                    eventToEdit={target}
                    setNewEvent={setNewEvent}
                    setShowStudentModal={onClose}
                    eventsData={eventsData}
                    studentEmail={studentEmail}
                />
            );

        /* ───────────── FALLBACK ───────────── */

        default:
            return null;
    }
};

export default CalendarRenderModals;
