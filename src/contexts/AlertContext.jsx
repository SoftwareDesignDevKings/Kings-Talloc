'use client';

import { createContext, useState, useMemo, useCallback, useEffect } from 'react';
import AlertBox from '@/components/AlertBox';

export const AlertContext = createContext();

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

            {/* Alerts stacked in fixed container */}
            <div className="toast-container position-fixed bottom-0 end-0 p-3">
                {alerts.map((alert) => (
                    <AlertBox
                        key={alert.id}
                        message={alert.message}
                        type={alert.type}
                        onClose={() => removeAlert(alert.id)}
                    />
                ))}
            </div>
            {/* <div className="position-fixed bottom-0 end-0 m-4 d-flex flex-column align-items-end gap-2" style={{ zIndex: 9999 }}>
                {alerts.map((alert) => (
                    <AlertBox
                        key={alert.id}
                        message={alert.message}
                        setMessage={() => removeAlert(alert.id)}
                        type={alert.type}
                        setType={() => {}}
                    />
                ))}
            </div> */}
        </AlertContext.Provider>
    );
};
