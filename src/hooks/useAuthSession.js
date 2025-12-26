import { useContext } from 'react';
import AuthContext from '@/contexts/AuthContext';

// /**
//  * Custom hook to access AuthContext Provider values (session, userRole, loading state)
//  */
// export const useAuthSession = () => {
//     const context = useContext(AuthContext);
//     if (!context) {
//         throw new Error('useAuthSession must be used within AuthProvider');
//     }
//     return context;
// };


const useAuthSession = () => useContext(AuthContext);

export default useAuthSession;
