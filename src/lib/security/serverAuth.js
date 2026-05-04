import 'server-only';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/security/authConfig';

export const getRequiredSession = async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return { error: Response.json({ message: 'Unauthorised' }, { status: 401 }) };
    }
    return { session };
};

export const getRequiredAdminOrTeacherSession = async () => {
    const { session, error } = await getRequiredSession();
    if (error) return { error };

    const userRole = session.user.defaultRole || session.user.role;
    const userRoles = session.user.userRoles || [];
    const allowed =
        userRole === 'admin' ||
        userRole === 'teacher' ||
        userRoles.includes('admin') ||
        userRoles.includes('teacher');

    if (!allowed) {
        return { error: Response.json({ message: 'Forbidden' }, { status: 403 }) };
    }

    return { session };
};
