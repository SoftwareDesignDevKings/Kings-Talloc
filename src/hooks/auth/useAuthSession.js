import { useContext } from 'react';
import AuthContext from '@/contexts/AuthContext';

/**
 * Hook to access auth context (session, userRole, loading state)
 */
export const useAuthSession = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuthSession must be used within AuthProvider');
    }
    return context;
};
