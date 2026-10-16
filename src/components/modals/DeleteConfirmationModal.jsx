'use client';

import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import { REQUEST_DELETE_WARNING } from '@/utils/destructiveActions';

/**
 * Confirms single-event, recurring-event and student-request deletion.
 */
const DeleteConfirmationModal = ({ show, onHide, onConfirm, isRecurring, isOriginal, isStudentRequest = false, loading = false }) => {
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
        return isStudentRequest ? 'Delete Student Request' : 'Delete Event';
    };

    const handleConfirm = () => {
        if (!loading) onConfirm(isRecurring ? deleteOption : 'this');
    };

    return (
        <BaseModal
            show={show}
            onHide={onHide}
            title={getTitle()}
            size="md"
            loading={loading}
            customFooter={
                <>
                    <button type="button" className="btn btn-outline-secondary" onClick={onHide} disabled={loading}>
                        Cancel
                    </button>
                    <button type="button" className="btn btn-danger" onClick={handleConfirm} disabled={loading}>
                        {loading ? 'Deleting…' : 'Delete'}
                    </button>
                </>
            }
        >
            {isStudentRequest && <p className="text-danger" role="alert">{REQUEST_DELETE_WARNING}</p>}
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
                    <div className="form-check mb-3">
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
                    <div className="alert alert-warning mb-0" role="alert">
                        <small className="text-danger">
                            <strong>Note:</strong> Deletes only non-modified allocated shifts into the future. All modified occurrences will need to be deleted separately.
                        </small>
                    </div>
                </>
            ) : !isStudentRequest ? (
                <p className="mb-0">Are you sure you want to permanently delete this event? This cannot be undone.</p>
            ) : null}
        </BaseModal>
    );
};

export default DeleteConfirmationModal;
