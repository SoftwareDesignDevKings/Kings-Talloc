'use client';

import { createContext, memo, useState, useMemo, useCallback, useEffect } from 'react';
import AlertBox from '@/components/AlertBox';

export const AlertContext = createContext();

// Wrap AlertBox so each row gets a STABLE onClose bound to its id. Without this,
// re-rendering the provider (e.g. another alert being added/removed) hands every
// existing toast a fresh `() => removeAlert(id)` and AlertBox's setup effect
// tears down and re-shows the Bootstrap toast — the visible "flash".
const MemoAlert = memo(function MemoAlert({ id, message, type, onClose }) {
    const handleClose = useCallback(() => onClose(id), [id, onClose]);
    return (
        <div style={{ pointerEvents: 'auto', width: '100%' }}>
            <AlertBox message={message} type={type} onClose={handleClose} />
        </div>
    );
});

/**
 * Custom Alert Provider for alert boxes
 * @param {JSX} children
 * @returns
 */
export const AlertContextProvider = ({ children }) => {
    const [alerts, setAlerts] = useState([]);

    // add a new alert to the stack - memoized to prevent re-renders
    const addAlert = useCallback((type, message) => {
        const id = Date.now() + Math.random();
        setAlerts((prev) => [...prev, { id, message, type }]);
    }, []);

    // remove an alert - memoized to prevent re-renders
    const removeAlert = useCallback((id) => {
        setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    }, []);

    // Dismiss oldest toast with fade-out animation
    const dismissOldestToast = useCallback(() => {
        if (alerts.length === 0 || !window.bootstrap) return;

        const toastContainer = document.querySelector('.toast-container');
        const firstToast = toastContainer?.querySelector('.toast');

        if (firstToast) {
            const toastInstance = window.bootstrap.Toast.getInstance(firstToast);
            if (toastInstance) {
                toastInstance.hide();
            }
        }
    }, [alerts.length]);

    // ESC key removes oldest toast for accessibility
    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                dismissOldestToast();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [dismissOldestToast]);

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({ addAlert }), [addAlert]);

    return (
        <AlertContext.Provider value={contextValue}>
            {children}

            {/* Alerts stacked bottom-right. Constrain the container so a tall
                stack never reaches the viewport edge — individual toasts set
                their own max-width (see AlertBox). */}
            <div
                className="toast-container position-fixed bottom-0 end-0 p-3 d-flex flex-column align-items-end"
                style={{ maxWidth: 'min(380px, 90vw)', maxHeight: '100vh', overflowY: 'auto', pointerEvents: 'none' }}
            >
                {alerts.map((alert) => (
                    <MemoAlert
                        key={alert.id}
                        id={alert.id}
                        message={alert.message}
                        type={alert.type}
                        onClose={removeAlert}
                    />
                ))}
            </div>
        </AlertContext.Provider>
    );
};
