'use client';

import React from 'react';

import { CalendarFlow } from '@/strategy/calendarStrategy';

import EventForm from '@/components/forms/EventForm.jsx';
import TutorAvailabilityForm from '@/components/forms/TutorAvailabilityForm.jsx';
import StudentEventForm from '@/components/forms/StudentEventForm.jsx';
import EventDetailsModal from '@/components/modals/EventDetailsModal.jsx';

const CalendarRenderModals = ({ action, target, onClose }) => {
    if (!action || !target) return null;

    switch (action) {
        /* ───────────── SHIFTS ───────────── */

        case CalendarFlow.CREATE_SHIFT:
            return (
                <EventForm
                    isEditing={false}
                    newEvent={target}
                    setNewEvent={() => {}}
                    setShowModal={onClose}
                />
            );

        case CalendarFlow.EDIT_SHIFT:
            return (
                <EventForm
                    isEditing
                    newEvent={target}
                    eventToEdit={target}
                    setNewEvent={() => {}}
                    setShowModal={onClose}
                />
            );

        case CalendarFlow.VIEW_SHIFT:
            return (
                <EventDetailsModal
                    event={target}
                    onClose={onClose}
                />
            );

        /* ───────────── AVAILABILITIES ───────────── */

        case CalendarFlow.CREATE_AVAILABILITY:
            return (
                <TutorAvailabilityForm
                    isEditing={false}
                    newAvailability={target}
                    setNewAvailability={() => {}}
                    setShowModal={onClose}
                />
            );

        case CalendarFlow.EDIT_AVAILABILITY:
            return (
                <TutorAvailabilityForm
                    isEditing
                    newAvailability={target}
                    eventToEdit={target}
                    setNewAvailability={() => {}}
                    setShowModal={onClose}
                />
            );

        case CalendarFlow.VIEW_AVAILABILITY:
            return (
                <EventDetailsModal
                    event={target}
                    onClose={onClose}
                />
            );

        /* ───────────── STUDENT REQUESTS ───────────── */

        case CalendarFlow.CREATE_STUDENT_REQUEST:
            return (
                <StudentEventForm
                    isEditing={false}
                    newEvent={target}
                    setNewEvent={() => {}}
                    setShowStudentModal={onClose}
                />
            );

        case CalendarFlow.EDIT_STUDENT_REQUEST:
            return (
                <StudentEventForm
                    isEditing
                    newEvent={target}
                    eventToEdit={target}
                    setNewEvent={() => {}}
                    setShowStudentModal={onClose}
                />
            );

        case CalendarFlow.VIEW_STUDENT_REQUEST:
            return (
                <EventDetailsModal
                    event={target}
                    onClose={onClose}
                />
            );

        /* ───────────── FALLBACK ───────────── */

        default:
            return null;
    }
};

export default CalendarRenderModals;
