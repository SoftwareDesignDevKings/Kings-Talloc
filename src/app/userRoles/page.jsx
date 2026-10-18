import UserRolesManager from "@/components/UserRolesManager"
import { getRequiredAdminSession } from '@/lib/security/serverAuth';
import { redirect } from 'next/navigation';

const UserRolesPage = async () => {
    const { error } = await getRequiredAdminSession();
    if (error) {
        redirect('/dashboard');
    }

    return (
        <UserRolesManager />
    )
    
}

export default UserRolesPage