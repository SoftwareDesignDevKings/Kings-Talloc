'use client';

import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';

/**
 * DeleteConfirmationModal - Confirms deletion of recurring events
 */
const DeleteConfirmationModal = ({ show, onHide, onConfirm, isRecurring, isOriginal }) => {
    // Default to 'all' if deleting original event, 'this' for instances
    const [deleteOption, setDeleteOption] = useState(isOriginal ? 'all' : 'this'); // 'this' | 'thisAndFuture' | 'all'

    // Reset deleteOption when modal opens or props change
    useEffect(() => {
        if (show) {
            setDeleteOption(isOriginal ? 'all' : 'this');
        }
    }, [show, isOriginal]);

    const getTitle = () => {
        if (isRecurring && isOriginal) {
            return 'Delete Recurring Event';
        }
        if (isRecurring && !isOriginal) {
            return 'Delete Recurring Event';
        }
        return 'Delete Event';
    };

    const handleConfirm = () => {
        onConfirm(deleteOption);
    };

    return (
        <BaseModal
            show={show}
            onHide={onHide}
            title={getTitle()}
            size="md"
            customFooter={
                <>
                    <button type="button" className="btn btn-secondary" onClick={onHide}>
                        Cancel
                    </button>
                    <button type="button" className="btn btn-danger" onClick={handleConfirm}>
                        Delete
                    </button>
                </>
            }
        >
            {isRecurring && isOriginal ? (
                <>
                    <p className="mb-3">
                        This is a recurring event. What would you like to delete?
                    </p>
                    <div className="form-check mb-2">
                        <input
                            className="form-check-input"
                            type="radio"
                            name="deleteOption"
                            id="deleteAll"
                            value="all"
                            checked={deleteOption === 'all'}
                            onChange={(e) => setDeleteOption(e.target.value)}
                        />
                        <label className="form-check-label" htmlFor="deleteAll">
                            All occurrences
                        </label>
                    </div>
                </>
            ) : isRecurring && !isOriginal ? (
                <>
                    <p className="mb-3">What would you like to delete?</p>
                    <div className="form-check mb-2">
                        <input
                            className="form-check-input"
                            type="radio"
                            name="deleteOption"
                            id="deleteThis"
                            value="this"
                            checked={deleteOption === 'this'}
                            onChange={(e) => setDeleteOption(e.target.value)}
                        />
                        <label className="form-check-label" htmlFor="deleteThis">
                            Only this occurrence
                        </label>
                    </div>
                    <div className="form-check">
                        <input
                            className="form-check-input"
                            type="radio"
                            name="deleteOption"
                            id="deleteThisAndFuture"
                            value="thisAndFuture"
                            checked={deleteOption === 'thisAndFuture'}
                            onChange={(e) => setDeleteOption(e.target.value)}
                        />
                        <label className="form-check-label" htmlFor="deleteThisAndFuture">
                            This and all future occurrences
                        </label>
                    </div>
                </>
            ) : (
                <p className="mb-0">Are you sure you want to delete this event?</p>
            )}
        </BaseModal>
    );
};

export default DeleteConfirmationModal;
