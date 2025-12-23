'use client';

import TutorHoursSummary from "@/components/TutorHoursSummary";
import useAuthSession from '@/hooks/useAuthSession';

const TutorHoursPage = () => {
    const { userRole, userEmail } = useAuthSession();

    return (
        <TutorHoursSummary userRole={userRole} userEmail={userEmail} />
    );
};

export default TutorHoursPage;
