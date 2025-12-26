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
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState('');

    return (
        <AlertContext.Provider value={{ alertMessage, setAlertMessage, alertType, setAlertType }}>
            {children}

            {/* on useContext(AlertContext) - render the Alert Box */}
            <AlertBox
                message={alertMessage}
                setMessage={setAlertMessage}
                type={alertType}
                setType={setAlertType}
            />
        </AlertContext.Provider>
    );
};

export default AlertProvider;
