import TutorHoursSummary from "@/components/TutorHoursSummary";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";

const TutorHoursPage = async () => {
    const session = await getServerSession(authOptions);
    return (
        <div className="overflow-y-auto overflow-x-hidden h-100">
            <TutorHoursSummary
                userRole={session.user.role}
                userEmail={session.user.email}
            />
        </div>
    );
};

export default TutorHoursPage;