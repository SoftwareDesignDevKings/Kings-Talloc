import ClassList from "@/components/ClassList";
import { getServerSession } from "next-auth";
import { redirect } from 'next/navigation';

const ClassesPage = async () => {
    const session = await getServerSession();
    if (!session) {
        redirect('/dashboard');
    }

    return (
        <ClassList />
    )
    
}

export default ClassesPage