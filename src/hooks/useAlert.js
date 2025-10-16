import { useContext } from "react";
import AlertContext from "@/contexts/AlertContext";


/**
 * wrapper hook for useContext(AlertContext)
 * @returns {object} context value from AlertContext
 * value={alertMessage, setAlertMessage, alertType, setAlertType }
 */
const useAlert = () => useContext(AlertContext);

export default useAlert;