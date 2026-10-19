'use client';

import { createContext, memo, useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AlertBox from '@/components/AlertBox';
import styles from '@/styles/alerts.module.css';

export const AlertContext = createContext();

// Keep each row stable when other alerts enter or leave the stack.
const MemoAlert = memo(function MemoAlert({ id, message, type, dismissRequested, onClose }) {
    const handleClose = useCallback(() => onClose(id), [id, onClose]);
    return (
        <div className={styles.row}>
            <AlertBox message={message} type={type} onClose={handleClose} dismissRequested={dismissRequested} />
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
    const [portalTarget, setPortalTarget] = useState(null);
    useEffect(() => { setPortalTarget(document.body); }, []);

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
        setAlerts(prev => prev.length
            ? [{ ...prev[0], dismissRequested: true }, ...prev.slice(1)]
            : prev);
    }, []);

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
            {portalTarget && createPortal(<div className={styles.stack} data-react-aria-top-layer>
                {alerts.map((alert) => (
                    <MemoAlert
                        key={alert.id}
                        id={alert.id}
                        message={alert.message}
                        type={alert.type}
                        dismissRequested={alert.dismissRequested}
                        onClose={removeAlert}
                    />
                ))}
            </div>, portalTarget)}
        </AlertContext.Provider>
    );
};
