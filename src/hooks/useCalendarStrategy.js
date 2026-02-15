import { teacherCalendarStrategy, tutorCalendarStrategy, coachCalendarStrategy, studentCalendarStrategy, adminCalendarStrategy} from "@/strategy/calendarStrategy";


const useCalendarStrategy = (userEmail, defaultUserRole, userRoles) => {
    if (userRoles && userRoles.includes("admin")) {
        return adminCalendarStrategy();
    }

    if (defaultUserRole === "teacher") {
        return teacherCalendarStrategy();
    } else if (defaultUserRole === "tutor") {
        return tutorCalendarStrategy(userEmail);
    } else if (defaultUserRole === "student") {
        return studentCalendarStrategy(userEmail);
    } else if (defaultUserRole === "coach") {
        return coachCalendarStrategy(userEmail);
    } else {
        throw new Error(`Unknown calendar role: ${defaultUserRole}`)
    }
};

export default useCalendarStrategy;