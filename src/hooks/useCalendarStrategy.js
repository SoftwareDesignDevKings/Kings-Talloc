import { teacherCalendarStrategy, tutorCalendarStrategy, coachCalendarStrategy, studentCalendarStrategy, adminCalendarStrategy} from "@/strategy/calendarStrategy";


const useCalendarStrategy = (userEmail, defaultUserRole, userRoles) => {
    console.log("userRoles: ", userRoles)

    if (defaultUserRole === "admin" || (userRoles && userRoles.includes("admin"))) {
        console.log("ADMIN")
        return adminCalendarStrategy();
    }

    if (defaultUserRole === "teacher") {
        console.log("TEACHER")
        return teacherCalendarStrategy();
    } else if (defaultUserRole === "tutor") {
        console.log("TUTOR")

        return tutorCalendarStrategy(userEmail);
    } else if (defaultUserRole === "student") {
        console.log("STUDENT")

        return studentCalendarStrategy(userEmail);
    } else if (defaultUserRole === "coach") {
        console.log("COACH")

        return coachCalendarStrategy(userEmail);
    } else {
        console.log("defaultUserRole: ", defaultUserRole)
        throw new Error(`Unknown calendar role: ${defaultUserRole}`)
    }
};

export default useCalendarStrategy;