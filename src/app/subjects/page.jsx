import SubjectList from "@/components/SubjectList";
import { getServerSession } from "next-auth";
import { redirect } from 'next/navigation';

const SubjectsPage = async () => {
    const session = await getServerSession();
    if (!session) {
        redirect('/dashboard');
    }

    return (
        <SubjectList />
    )
    
}

export default SubjectsPage