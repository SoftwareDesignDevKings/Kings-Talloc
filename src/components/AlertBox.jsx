'use client';

import { useEffect, useRef } from 'react';

const TOAST_MAX_WIDTH = 360;

/**
 * Notification alert box component for displaying messages
 * - Type: can be either "ERROR", "WARNING", "INFO", or "SUCCESS"
 * @param {string} message - The message to display in the alert box
 * @param {string} type - The type of alert: 'error', 'warning', 'info', 'success'
 * @param {Function} onClose - Callback fired when the toast is dismissed
 * @returns {JSX.Element | null}
 */
const AlertBox = ({ message, type, onClose }) => {
    const toastRef = useRef(null);
    // Keep the latest onClose in a ref so the show/dispose effect doesn't
    // re-run every time the parent re-creates the callback (which restarts
    // Bootstrap's fade-in animation — the "flashing" bug).
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

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
        warning: {
            colour: 'bg-warning',
            iconClass: 'bi-exclamation-triangle-fill',
            textClass: 'text-dark',
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
                onCloseRef.current?.();
            };

            toastElement.addEventListener('hidden.bs.toast', handleHidden);
            toastBootstrap.show();

            return () => {
                toastElement.removeEventListener('hidden.bs.toast', handleHidden);
                toastBootstrap.dispose();
            };
        }
    }, [config]);

    if (!config) {
        return null;
    }

    return (
        <div
            ref={toastRef}
            className={`toast align-items-center border-0 mb-2 shadow ${config.textClass || 'text-white'} ${config.colour}`}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            data-bs-autohide="true"
            data-bs-delay="5000"
            style={{ maxWidth: TOAST_MAX_WIDTH, width: '100%' }}
        >
            <div className="d-flex">
                <div className="toast-body d-flex align-items-center flex-grow-1 py-3 px-3" style={{ minWidth: 0 }}>
                    <i className={`bi ${config.iconClass} me-3 fs-5 flex-shrink-0`}></i>
                    <span className="fs-6" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{message}</span>
                </div>
                <button
                    type="button"
                    className={`btn-close ${config.textClass ? '' : 'btn-close-white'} me-3 m-auto`}
                    data-bs-dismiss="toast"
                    aria-label="Close"
                ></button>
            </div>
        </div>
    );
};

export default AlertBox;