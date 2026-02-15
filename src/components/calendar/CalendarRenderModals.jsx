'use client';

import React, { useMemo, useEffect } from 'react';
import useModalActionStrategy from '@/hooks/useModalActionStrategy';
import useAuthSession from '@/hooks/useAuthSession';

const CalendarRenderModals = ({ calendarAction, calendarTarget, updateCalendarTarget, onClose }) => {
    const modalActionStrategy = useModalActionStrategy(calendarAction);
    const { session, userRole } = useAuthSession();
    const userEmail = session.user.email;

    // memoise the modal data so it doesn't recreate on every render
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

    // sync draft data back to calendarTarget when first created
    // this ensures subsequent updates preserve the entityType and prevent re-creating the draft
    useEffect(() => {
        if (modalData && modalData.entityType && !calendarTarget.entityType) {
            updateCalendarTarget(modalData);
        }
    }, [modalData, calendarTarget, updateCalendarTarget]);

    // guard before rendering
    if (!calendarAction || !calendarTarget || !modalActionStrategy) {
        return null;
    }

    const { Modal, mode, dataProp } = modalActionStrategy;
    const updateFormState = (updates) => updateCalendarTarget(updates);

    const modalProps = {
        mode,
        [dataProp]: modalData,
        ...(mode !== 'create' && { eventToEdit: modalData }),
        setShowModal: onClose,
        setShowStudentModal: onClose,
        userEmail,
        userRole,
    };

    if (dataProp === 'newEvent') {
        modalProps.setNewEvent = updateFormState;
    } else {
        modalProps.setNewAvailability = updateFormState;
    }

    return <Modal {...modalProps} />;
};

export default CalendarRenderModals;
