'use client';

import React, { useMemo } from 'react';
import useModalActionStrategy from '@/hooks/useModalActionStrategy';
import useAuthSession from '@/hooks/useAuthSession';

const CalendarRenderModals = ({
    calendarAction,
    calendarTarget,
    onClose,
    updateCalendarTarget,
}) => {
    // Hook is allowed to return null
    const modalActionStrategy = useModalActionStrategy(calendarAction);
    const { session } = useAuthSession();
    const userEmail = session?.user.email;
    // Memoize the modal data so it doesn't recreate on every render
    // Must be called before any early returns (Rules of Hooks)
    const modalData = useMemo(() => {
        if (!modalActionStrategy || !calendarTarget) {
            return null;
        }

        const { mode, createDraft } = modalActionStrategy;

        if (mode !== 'create' || !createDraft) {
            return calendarTarget;
        }

        // TEMP FIX: only create draft once
        if (calendarTarget.entityType) {
            return calendarTarget;
        }

        return createDraft({
            ...calendarTarget,
            userEmail: userEmail,
        });
    }, [modalActionStrategy, calendarTarget, userEmail]);

    // ⛔ Guard BEFORE rendering
    if (!calendarAction || !calendarTarget || !modalActionStrategy) {
        return null;
    }

    // ✅ Safe to destructure now
    const { Modal, mode, createDraft, dataProp } = modalActionStrategy;

    const updateFormState = (updates) => updateCalendarTarget(updates);

    const modalProps = {
        mode,
        [dataProp]: modalData,
        ...(mode !== 'create' && { eventToEdit: modalData }),
        setShowModal: onClose,
        setShowStudentModal: onClose,
        userEmail,
    };

    if (dataProp === 'newEvent') {
        modalProps.setNewEvent = updateFormState;
    } else {
        modalProps.setNewAvailability = updateFormState;
    }

    return <Modal {...modalProps} />;
};

export default CalendarRenderModals;
