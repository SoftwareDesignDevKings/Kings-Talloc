'use client';

import React, { useMemo } from 'react';
import useModalActionStrategy from '@/hooks/useModalActionStrategy';

const CalendarRenderModals = ({
    calendarAction,
    calendarTarget,
    onClose,
    updateCalendarTarget,
    studentEmail,
}) => {
    // Hook is allowed to return null
    const modalActionStrategy = useModalActionStrategy(calendarAction);

    // ⛔ Guard BEFORE destructuring
    if (!calendarAction || !calendarTarget || !modalActionStrategy) {
        return null;
    }

    // ✅ Safe to destructure now
    const { Modal, mode, createDraft, dataProp } = modalActionStrategy;

    const calendarTargetForModal = () => {
        if (mode !== 'create' || !createDraft) {
            return calendarTarget;
        }

        return createDraft({
            ...calendarTarget,
            userEmail: studentEmail,
        });
    };

    const updateFormState = (updates) =>
        updateCalendarTarget((prev) => ({
            ...prev,
            ...updates,
        }));

    const modalProps = {
        mode,
        [dataProp]: calendarTargetForModal(),
        ...(mode !== 'create' && { eventToEdit: calendarTargetForModal() }),
        setShowModal: onClose,
        setShowStudentModal: onClose,
        studentEmail,
    };

    if (dataProp === 'newEvent') {
        modalProps.setNewEvent = updateFormState;
    } else {
        modalProps.setNewAvailability = updateFormState;
    }

    return <Modal {...modalProps} />;
};

export default CalendarRenderModals;
