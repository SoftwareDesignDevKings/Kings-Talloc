import TutorHoursSummary from "@/components/TutorHoursSummary";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";

const TutorHoursPage = async () => {
    const session = await getServerSession(authOptions);
    return (
        <TutorHoursSummary 
            userRole={session.user.role} 
            userEmail={session.user.email} 
        />
    );
};

export default TutorHoursPage;