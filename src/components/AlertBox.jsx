'use client';

import { useEffect, useRef } from 'react';

/**
 * Notification alert box component for displaying messages
 * - Type: can be either "ERROR", "INFO", or "SUCCESS"
 * @param {String} message - The message to display in the alert box
 * @param {String} type - The type of alert: 'error', 'info', 'success'
 * @returns
 */
const AlertBox = ({ message, type, onClose }) => {
    const toastRef = useRef(null);

    if (!type) {
        throw new Error("AlertBox: 'type' prop is required (ERROR, SUCCESS, or INFO)");
    }

    if (!message) {
        throw new Error("AlertBox: 'message' prop is required");
    }

    const lowerType = type.toLowerCase();
    let colour = '';
    let iconClass = '';

    // Set the color and icon class based on the type
    if (lowerType === 'error') {
        colour = 'bg-danger';
        iconClass = 'bi-exclamation-triangle-fill';
    } else if (lowerType === 'info') {
        colour = 'bg-primary';
        iconClass = 'bi-info-circle-fill';
    } else if (lowerType === 'success') {
        colour = 'bg-success';
        iconClass = 'bi-check-circle-fill';
    } else {
        return null;
    }

    // initialise and show toast only once on mount
    useEffect(() => {
        const toastElement = toastRef.current;

        if (toastElement && window.bootstrap) {
            const toastBootstrap = window.bootstrap.Toast.getOrCreateInstance(toastElement);
            toastBootstrap.show();

            const handleHidden = () => {
                onClose();
            };

            toastElement.addEventListener('hidden.bs.toast', handleHidden);

            return () => {
                toastElement.removeEventListener('hidden.bs.toast', handleHidden);
                toastBootstrap.dispose();
            };
        }
    }, []);

    return (
        <div
            ref={toastRef}
            className={`toast align-items-center border-0 mb-2 shadow text-white w-auto ${colour}`}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            data-bs-autohide="true"
            data-bs-delay="5000"
        >
            <div className="d-flex">
                <div className="toast-body d-flex align-items-center flex-grow-1 py-3 px-3">
                    <i className={`bi ${iconClass} me-3 fs-5`}></i>
                    <span className="fs-6">{message}</span>
                </div>
                <button
                    type="button"
                    className="btn-close btn-close-white me-3 m-auto"
                    data-bs-dismiss="toast"
                    aria-label="Close"
                ></button>
            </div>
        </div>
    );
};

export default AlertBox;
