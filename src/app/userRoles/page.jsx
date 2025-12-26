import UserRolesManager from "@/components/UserRolesManager"
import { getServerSession } from "next-auth";
import { redirect } from 'next/navigation';

const UserRolesPage = async () => {
    const session = await getServerSession();
    if (!session) {
        redirect('/dashboard');
    }

    return (
        <UserRolesManager />
    )
    
}

export default UserRolesPage