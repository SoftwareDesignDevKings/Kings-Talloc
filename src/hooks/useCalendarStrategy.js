import { teacherCalendarStrategy, tutorCalendarStrategy, studentCalendarStrategy} from "@/strategy/calendarStrategy";

// .freeze makes it immutable (not using TS here)
// export const CalendarEntityType = Object.freeze({
//     SHIFT: 'shifts',
//     AVAILABILITY: 'availability',
//     STUDENT_REQUEST: 'studentRequest',
// });

const useCalendarStrategy = (userEmail, userRole) => {
    if (userRole === "teacher") {
        return teacherCalendarStrategy();
    } else if (userRole === "tutor") {
        return tutorCalendarStrategy(userEmail);
    } else if (userRole === "student") {
        return studentCalendarStrategy(userEmail);
    } else {
        throw new Error(`Unknown calendar role: ${userRole}`)
    }
};

export default useCalendarStrategy;