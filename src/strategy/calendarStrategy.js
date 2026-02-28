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
    AVAILABILITY: 'tutorAvailabilities',
    STUDENT_REQUEST: 'studentEventRequests',
});

export const adminCalendarStrategy = () => ({
    // Firestore query constraints - null means skip that collection entirely
    firestoreConstraints: {
        shifts:          () => [],   // fetch all
        studentRequests: () => [],   // fetch all
        availabilities:  () => [],   // fetch all
    },

    permissions: {
        canEdit: (event) =>
            event.entityType === CalendarEntityType.SHIFT,

        canDrag: (event) =>
            event.entityType === CalendarEntityType.SHIFT,

        canResize: (event) =>
            event.entityType === CalendarEntityType.SHIFT,
    },

    visibility: {
        includeInCalendar: (event) =>
            event.entityType === CalendarEntityType.SHIFT || event.entityType === CalendarEntityType.STUDENT_REQUEST,
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
            // Teachers use EventForm for both shifts and student requests (to approve/convert)
            return CalendarFlow.EDIT_SHIFT;
        }
    },
});

export const teacherCalendarStrategy = () => ({
    // Fetch all data — teacher has full visibility but limited write access
    firestoreConstraints: {
        shifts:          () => [],   // fetch all (read-only view)
        studentRequests: () => [],   // fetch all (can manage)
        availabilities:  () => [],   // fetch all
    },

    permissions: {
        canEdit:   (event) => event.entityType === CalendarEntityType.STUDENT_REQUEST,
        canDrag:   (event) => event.entityType === CalendarEntityType.STUDENT_REQUEST,
        canResize: (event) => event.entityType === CalendarEntityType.STUDENT_REQUEST,
    },

    visibility: {
        includeInCalendar: (event) =>
            event.entityType === CalendarEntityType.SHIFT ||
            event.entityType === CalendarEntityType.STUDENT_REQUEST,
        showAvailabilitySlots: true,
    },

    calendarFilters: {
        canFilterByTutor: true,
        canFilterBySubject: true,
        canFilterByWorkType: true,
        canFilterByAvailabilityType: true,
    },

    calendarScope: {
        canToggleDeniedStudentRequests: true,
        canToggleTutorAvailabilities: true,
        canToggleCoachingShifts: true,
        canToggleTutoringShifts: true,
    },

    actions: {
        canCreateEvent:    (event) => event.entityType === CalendarEntityType.STUDENT_REQUEST,
        canModifyEvent:    (event) => event.entityType === CalendarEntityType.STUDENT_REQUEST,
        canDuplicateEvent: (event) => event.entityType === CalendarEntityType.STUDENT_REQUEST,

        getCreateFlow: () => CalendarFlow.CREATE_STUDENT_REQUEST,
        getEventFlow: (event) => {
            if (event.entityType === CalendarEntityType.SHIFT) {
                return CalendarFlow.VIEW_SHIFT;
            }
            return CalendarFlow.EDIT_STUDENT_REQUEST;
        },
    },
});

// temp sol - coaches r the same as just tutors.
export const coachCalendarStrategy = (userEmail) => tutorCalendarStrategy(userEmail)

export const tutorCalendarStrategy = (userEmail) => ({
    // Firestore query constraints - null means skip that collection entirely
    firestoreConstraints: {
        shifts:          () => [{ fbField: 'emailsList', fbOperation: 'array-contains', fbValue: userEmail }],
        studentRequests: () => null,  // tutors don't see student requests
        availabilities:  () => [],   // fetch all for overlay; own filtered in CalendarUIContextProvider
    },

    permissions: {
        canEdit: (event) => event.entityType === CalendarEntityType.AVAILABILITY,
        canDrag: (event) => event.entityType === CalendarEntityType.AVAILABILITY,
        canResize: (event) => event.entityType === CalendarEntityType.AVAILABILITY,
    },

    visibility: {
        includeInCalendar: (event) =>
            event.entityType === CalendarEntityType.SHIFT ||
            event.entityType === CalendarEntityType.AVAILABILITY,
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
                return CalendarFlow.VIEW_SHIFT;
            }

            if (event.entityType === CalendarEntityType.AVAILABILITY) {
                return CalendarFlow.EDIT_AVAILABILITY;
            }

            return null;
        }
    }
});

export const studentCalendarStrategy = (userEmail) => ({
    // Firestore query constraints - null means skip that collection entirely
    firestoreConstraints: {
        shifts:          () => [{ fbField: 'emailsList', fbOperation: 'array-contains', fbValue: userEmail }],
        studentRequests: () => [{ fbField: 'emailsList', fbOperation: 'array-contains', fbValue: userEmail }],
        availabilities:  () => [],  // fetch all (for overlay initials)
    },

    permissions: {
        canEdit: (event) => event.entityType === CalendarEntityType.STUDENT_REQUEST,
        canDrag: (event) => event.entityType === CalendarEntityType.STUDENT_REQUEST,
        canResize: (event) => event.entityType === CalendarEntityType.STUDENT_REQUEST,
    },

    visibility: {
        includeInCalendar: (event) =>
            event.entityType === CalendarEntityType.STUDENT_REQUEST ||
            event.entityType === CalendarEntityType.SHIFT,

        showAvailabilitySlots: true,
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
            event.entityType === CalendarEntityType.STUDENT_REQUEST,
        
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
