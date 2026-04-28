import { adminDb, adminDbAuth } from '@/firestore/firestoreAdmin';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/security/authConfig';

export async function DELETE(req) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return Response.json({ message: 'Unauthorised' }, { status: 401 });
    }

    const userRole = session.user.defaultRole || session.user.role;
    const isAdmin = userRole === 'admin' || (session.user.userRoles || []).includes('admin');
    if (!isAdmin) {
        return Response.json({ message: 'Forbidden: Only admins can delete users' }, { status: 403 });
    }

    const { email } = await req.json();
    if (!email) {
        return Response.json({ message: 'email is required' }, { status: 400 });
    }

    try {
        const authUser = await adminDbAuth.getUserByEmail(email);
        await adminDbAuth.deleteUser(authUser.uid);
    } catch (error) {
        // If the user doesn't exist in Firebase Auth, that's fine — continue to Firestore delete
        if (error.code !== 'auth/user-not-found') {
            return Response.json({ message: `Failed to delete from Firebase Auth: ${error.message}` }, { status: 500 });
        }
    }

    try {
        await adminDb.collection('users').doc(email).delete();
    } catch (error) {
        return Response.json({ message: `Failed to delete user entry from Firebase: ${error.message}` }, { status: 500 });
    }

    return Response.json({ message: `User ${email} deleted successfully.` });
}
