'use client';

import AlertContext from '@/contexts/AlertContext';
import AlertBox from '@/components/AlertBox';
import { useState } from 'react';

/**
 * Custom Alert Provider for alert boxes
 * @param {JSX} children
 * @returns
 */
const AlertProvider = ({ children }) => {
    const [alerts, setAlerts] = useState([]);

    // add a new alert to the stack
    const addAlert = (type, message) => {
        const id = Date.now() + Math.random();
        setAlerts((prev) => [...prev, { id, message, type }]);
    };

    // remove an alert
    const removeAlert = (id) => {
        setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    };

    return (
        <AlertContext.Provider value={{ addAlert }}>
            {children}

            {/* Alerts stacked in fixed container */}
            <div className="position-fixed bottom-0 end-0 m-4 d-flex flex-column align-items-end gap-2">
                {alerts.map((alert) => (
                    <AlertBox
                        key={alert.id}
                        message={alert.message}
                        setMessage={() => removeAlert(alert.id)}
                        type={alert.type}
                        setType={() => {}}
                    />
                ))}
            </div>
        </AlertContext.Provider>
    );
};

export default AlertProvider;
