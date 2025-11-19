'use client';

import { useEffect } from 'react';

/**
 * Notification alert box component for displaying messages
 * - Type: can be either "ERROR", "INFO", or "SUCCESS"
 * @param {String} message - The message to display in the alert box
 * @param {Function} setMessage - Function to update the message state
 * @param {String} type - The type of alert: 'error', 'info', 'success'
 * @param {Function} setType - Function to update the type state
 * @returns
 */
const AlertBox = ({ message, setMessage, type, setType }) => {
    type = type.toLowerCase();

    // clear state for message after 3 seconds if it's a success message
    useEffect(() => {
        if (type === 'success' && message !== '') {
            const timer = setTimeout(() => setMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [message, type, setMessage]);

    // Handle closing the alert
    const handleAlertClose = () => {
        setMessage('');
        setType('');
    };

    if (message === '') {
        return null;
    }

    let colour = '';
    let iconClass = '';
    // Set the color and icon class based on the type
    if (type === 'error') {
        colour = 'bg-danger';
        iconClass = 'bi-exclamation-triangle-fill';
    } else if (type === 'info') {
        colour = 'bg-primary';
        iconClass = 'bi-info-circle-fill';
    } else if (type === 'success') {
        colour = 'bg-success';
        iconClass = 'bi-check-circle-fill';
    } else {
        return null;
    }

    return (
        <div className="modal show d-block w-auto m-4" aria-hidden="false">
            <div className={`modal-content ${colour} position-fixed bottom-0 end-0 m-4 w-auto`}>
                <div className="modal-header border-0 py-3">
                    <div className="modal-body text-white m-0 p-0" id="alertModalLabel">
                        <i className={`bi ${iconClass} flex-shrink-0 me-2`}></i>
                        {message}
                    </div>
                    <button
                        type="button"
                        className="btn-close btn-close-white ms-2 p-0 m-auto"
                        onClick={handleAlertClose}
                    ></button>
                </div>
            </div>
        </div>
    );
};

export default AlertBox;
