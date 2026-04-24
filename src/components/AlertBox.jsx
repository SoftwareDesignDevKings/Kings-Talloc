'use client';

import { useEffect, useRef } from 'react';

/**
 * Notification alert box component for displaying messages
 * - Type: can be either "ERROR", "INFO", or "SUCCESS"
 * @param {string} message - The message to display in the alert box
 * @param {string} type - The type of alert: 'error', 'info', 'success'
 * @param {Function} onClose - Callback fired when the toast is dismissed
 * @returns {JSX.Element | null}
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

    const alertConfig = {
        error: {
            colour: 'bg-danger',
            iconClass: 'bi-exclamation-triangle-fill',
        },
        info: {
            colour: 'bg-primary',
            iconClass: 'bi-info-circle-fill',
        },
        success: {
            colour: 'bg-success',
            iconClass: 'bi-check-circle-fill',
        },
    };

    const config = alertConfig[lowerType];

    useEffect(() => {
        if (!config) {
            return;
        }

        const toastElement = toastRef.current;

        if (toastElement && window.bootstrap) {
            const toastBootstrap =
                window.bootstrap.Toast.getOrCreateInstance(toastElement);

            const handleHidden = () => {
                if (onClose) {
                    onClose();
                }
            };

            toastElement.addEventListener('hidden.bs.toast', handleHidden);
            toastBootstrap.show();

            return () => {
                toastElement.removeEventListener('hidden.bs.toast', handleHidden);
                toastBootstrap.dispose();
            };
        }
    }, [config, onClose]);

    if (!config) {
        return null;
    }

    return (
        <div
            ref={toastRef}
            className={`toast align-items-center border-0 mb-2 shadow text-white w-auto ${config.colour}`}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            data-bs-autohide="true"
            data-bs-delay="5000"
        >
            <div className="d-flex">
                <div className="toast-body d-flex align-items-center flex-grow-1 py-3 px-3">
                    <i className={`bi ${config.iconClass} me-3 fs-5`}></i>
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