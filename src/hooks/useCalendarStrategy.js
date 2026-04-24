import { teacherCalendarStrategy, tutorCalendarStrategy, coachCalendarStrategy, studentCalendarStrategy, adminCalendarStrategy} from "@lib/patterns/calendarStrategy";

/**
 * Simple role-based calendar strategy
 * Uses defaultRole only - additional roles (admin, coach, etc.) can be implemented later
 */
const useCalendarStrategy = (userEmail, defaultUserRole, userRoles = []) => {
    if (defaultUserRole === "admin") {
        return adminCalendarStrategy();
    } else if (defaultUserRole === "teacher") {
        return teacherCalendarStrategy();
    } else if (defaultUserRole === "tutor") {
        return tutorCalendarStrategy(userEmail);
    } else if (defaultUserRole === "coach") {
        return coachCalendarStrategy(userEmail);
    } else if (defaultUserRole === "student") {
        return studentCalendarStrategy(userEmail);
    } else {
        throw new Error(`Unknown calendar role: ${defaultUserRole}`)
    }
};

export default useCalendarStrategy;