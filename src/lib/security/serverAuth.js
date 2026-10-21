import 'server-only';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/security/authConfig';
import { getCachedCurrentAccount } from './accountState';

export const getRequiredSession = async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return { error: Response.json({ message: 'Unauthorised' }, { status: 401 }) };
    }
    try {
        const account = await getCachedCurrentAccount(session.user.email, session.user.authVersion || '');
        if (!account) return { error: Response.json({ message: 'Account access was revoked. Please sign in again.' }, { status: 401 }) };
        return { session: { ...session, user: { ...session.user, email: account.email, role: account.defaultRole,
            defaultRole: account.defaultRole, userRoles: account.userRoles, profileId: account.profileId, authVersion: account.authVersion } } };
    } catch {
        return { error: Response.json({ message: 'Unable to verify account access. Please retry.' }, { status: 503 }) };
    }
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

export const getRequiredAdminSession = async () => {
    const { session, error } = await getRequiredSession();
    if (error) return { error };

    const userRole = session.user.defaultRole || session.user.role;
    const userRoles = session.user.userRoles || [];
    const allowed = userRole === 'admin' || userRoles.includes('admin');

    if (!allowed) {
        return { error: Response.json({ message: 'Forbidden' }, { status: 403 }) };
    }

    return { session };
};
