import { createContext, useContext } from 'react';
export const DashboardLoadingContext = createContext({});
export const useDashboardLoading = () => useContext(DashboardLoadingContext).shiftsLoading || false;
export const useDashboardRequestsLoading = () => useContext(DashboardLoadingContext).requestsLoading || false;
