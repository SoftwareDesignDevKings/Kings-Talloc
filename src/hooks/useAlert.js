import { useContext } from 'react';
import AlertContext from '@/contexts/AlertContext';

/**
 * wrapper hook for useContext(AlertContext)
 * @returns {object} context value from AlertContext
 * 
 */
const useAlert = () => useContext(AlertContext);

export default useAlert;
