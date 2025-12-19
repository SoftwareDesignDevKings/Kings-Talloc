// import { CalendarEntityType } from "@/hooks/useCalendarStrategy";

export const CalendarFlow = Object.freeze({
    CREATE_SHIFT: 'createShift',
    EDIT_SHIFT: 'editShift',
    VIEW_SHIFT: 'viewShift',

    CREATE_STUDENT_REQUEST: 'createStudentRequest',
    EDIT_STUDENT_REQUEST: 'editStudentRequest',
    VIEW_STUDENT_REQUEST: 'viewStudentRequest',

    CREATE_AVAILABILITY: 'createAvailability',
    EDIT_AVAILABILITY: 'editAvailability',
    VIEW_AVAILABILITY: 'viewAvailability',
});

export const CalendarEntityType = Object.freeze({
    SHIFT: 'shifts',
    AVAILABILITY: 'availability',
    STUDENT_REQUEST: 'studentRequest',
});

export const teacherCalendarStrategy = () => ({
    permissions: {
        canEdit: (event) =>
            event.entityType === CalendarEntityType.SHIFT,

        canDrag: (event) =>
            event.entityType === CalendarEntityType.SHIFT,

        canResize: (event) =>
            event.entityType === CalendarEntityType.SHIFT,
    },

    visibility: {
        includeInCalendar: (event) => event.entityType === CalendarEntityType.SHIFT,
        showAvailabilitySlots: true,
    },

    // panel filters
    calendarFilters: {
        canFilterByTutor: true,
        canFilterBySubject: true,
        canFilterByWorkType: true,
        canFilterByAvailabilityType: true,
    },

    // teacher can see all tutor availabilities, but UI view is initials not CustomEvent. 
    // CustomEvent UI not defined in calStrategy
    calendarScope: {
        canToggleDeniedStudentRequests: true,
        canToggleTutorAvailabilities: true,
        canToggleCoachingShifts: true,
        canToggleTutoringShifts: true,
    },

    actions: {
        // can only modify and create shifts
        canCreateEvent: (event) => event.entityType === CalendarEntityType.SHIFT,
        canModifyEvent: (event) => event.entityType === CalendarEntityType.SHIFT,
        canDuplicateEvent: (event) => event.entityType === CalendarEntityType.SHIFT,

        // should only be allowed to create / edit shifts
        getCreateFlow: () => CalendarFlow.CREATE_SHIFT,
        getEventFlow: (event) => {
            if (event.entityType === CalendarEntityType.STUDENT_REQUEST) {
                return CalendarFlow.EDIT_STUDENT_REQUEST
            } else {
                return CalendarFlow.EDIT_SHIFT
            }
        }
    },
});

export const tutorCalendarStrategy = (userEmail) => ({
    permissions: {
        canEdit: (event) =>
            event.entityType === CalendarEntityType.AVAILABILITY &&
            event.tutor === userEmail,

        canDrag: (event) =>
            event.entityType === CalendarEntityType.AVAILABILITY &&
            event.tutor === userEmail,

        canResize: (event) =>
            event.entityType === CalendarEntityType.AVAILABILITY &&
            event.tutor === userEmail,
    },

    visibility: {
        includeInCalendar: (event) => {
            if (event.entityType === CalendarEntityType.AVAILABILITY) {
                // Only my own availability is a real event
                return event.tutor === userEmail;
            }

            if (event.entityType === CalendarEntityType.SHIFT) {
                return event.tutors?.includes(userEmail);
            }

            return false;
        },
        showAvailabilitySlots: true,
    },

    // panel filters
    calendarFilters: {
        canFilterByTutor: true,
        canFilterBySubject: true,
        canFilterByWorkType: true,
        canFilterByAvailabilityType: true,
    },

    // panel scopes - studenRequests, tutor shifts / availabilities
    calendarScope: {
        canToggleDeniedStudentRequests: false,
        canToggleTutorAvailabilities: true,
        canToggleCoachingShifts: true,
        canToggleTutoringShifts: true,
    },

    actions: {
        canCreateEvent: (event) => event.entityType === CalendarEntityType.AVAILABILITY,
        canModifyEvent: (event) => event.entityType === CalendarEntityType.AVAILABILITY,
        canDuplicateEvent: (event) => event.entityType === CalendarEntityType.AVAILABILITY,

        getCreateFlow: () => CalendarFlow.CREATE_AVAILABILITY,
        getEventFlow: (event) => {
            if (event.entityType === CalendarEntityType.SHIFT) {
                return CalendarFlow.VIEW_SHIFT
            } else {
                return CalendarFlow.VIEW_AVAILABILITY
            }
        }
    }
});

export const studentCalendarStrategy = (userEmail) => ({
    permissions: {
        canEdit: (event) =>
            event.entityType === CalendarEntityType.STUDENT_REQUEST &&
            (event.students?.includes(userEmail) || event.isStudentRequest),

        canDrag: (event) => 
            event.entityType === CalendarEntityType.STUDENT_REQUEST &&
            (event.students?.includes(userEmail) || event.isStudentRequest),

        canResize: (event) => 
            event.entityType === CalendarEntityType.STUDENT_REQUEST &&
            (event.students?.includes(userEmail) || event.isStudentRequest),
    },

    visibility: {
        includeInCalendar: (event) => {
            if (event.entityType === CalendarEntityType.STUDENT_REQUEST) {
                return event.students?.includes(userEmail) || event.isStudentRequest;
            }

            if (event.entityType === CalendarEntityType.SHIFT) {
                return event.students?.includes(userEmail) || event.isStudentRequest;
            }

            return false;
        },

        showAvailabilitySlots: false,
    },

    // students cannot accesss tutor avail type
    calendarFilters: {
        canFilterByTutor: true,
        canFilterBySubject: true,
        canFilterByWorkType: true,
        canFilterByAvailabilityType: false,
    },

    // tutors can only see the approveds shifts (coaching || tutoring)
    calendarScope: {
        canToggleDeniedStudentRequests: false,
        canToggleTutorAvailabilities: true,
        canToggleCoachingShifts: true,
        canToggleTutoringShifts: true,
    },


    actions: {
        canCreateEvent: (event) => 
            event.entityType === CalendarEntityType.STUDENT_REQUEST,
        canModifyEvent: (event) => 
            event.entityType === CalendarEntityType.STUDENT_REQUEST &&
            (event.students?.includes(userEmail) || event.isStudentRequest),
        
        canDuplicateEvent: (event) => {
            if (event.entityType === CalendarEntityType.STUDENT_REQUEST) {
                return true
            } else {
                return false
            }
        },

        getCreateFlow: () => CalendarFlow.CREATE_STUDENT_REQUEST,
        getEventFlow: (calEvent) => {
            if (calEvent.entityType === CalendarEntityType.SHIFT) {
                return CalendarFlow.VIEW_SHIFT
            } else {
                return CalendarFlow.EDIT_STUDENT_REQUEST
            }
        }
    },
});
