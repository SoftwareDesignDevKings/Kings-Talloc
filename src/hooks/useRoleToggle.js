import useAuthSession from '@/hooks/useAuthSession';
import { ROLE_LABELS } from '@/constants/navigation';

// "View as Admin" / "View as Teacher" switch shared by the sidebar and the phone menu.
export default function useRoleToggle(userRole) {
    const { session, userRoles, switchRole } = useAuthSession();
    const hasAdminAccess = userRoles?.includes('admin') || session?.user?.defaultRole === 'admin';
    const isCurrentlyAdmin = userRole === 'admin';
    const originalRole = session?.user?.defaultRole;
    const roleLabel = isCurrentlyAdmin ? `View as ${ROLE_LABELS[originalRole] || originalRole}` : 'View as Admin';
    const toggleRole = () => switchRole(isCurrentlyAdmin ? originalRole || 'student' : 'admin');
    return { hasAdminAccess, roleLabel, toggleRole };
}
