import { CalendarFlow, CalendarEntityType } from '@/strategy/calendarStrategy';

import EventForm from '@/components/forms/EventForm.jsx';
import StudentEventForm from '@/components/forms/StudentEventForm.jsx';
import TutorAvailabilityForm from '@/components/forms/TutorAvailabilityForm.jsx';

const MODAL_ACTION_STRATEGY = {
    /* ───────────────────────── SHIFTS ───────────────────────── */

    [CalendarFlow.CREATE_SHIFT]: {
        Modal: EventForm,
        mode: 'create',
        dataProp: 'newEvent',

        createDraft: ({ start, end, userEmail }) => ({
            entityType: CalendarEntityType.SHIFT,
            start,
            end,

            title: '',
            description: '',
            staff: [],
            classes: [],
            students: [],

            tutorResponses: [],
            studentResponses: [],
            minStudents: 0,

            createdByStudent: false,
            approvalStatus: 'pending',
            workStatus: 'notCompleted',
            workType: 'tutoring',
            locationType: '',
            subject: null,
            preference: null,

            recurring: null,
            until: null, // optional but safe
            createTeamsMeeting: false,
            confirmationRequired: false,

            createdBy: userEmail,
        }),
    },

    [CalendarFlow.EDIT_SHIFT]: {
        Modal: EventForm,
        mode: 'edit',
        dataProp: 'newEvent',
    },

    [CalendarFlow.VIEW_SHIFT]: {
        Modal: EventForm,
        mode: 'view',
        dataProp: 'newEvent',
    },

    /* ───────────────────── AVAILABILITIES ───────────────────── */

    [CalendarFlow.CREATE_AVAILABILITY]: {
        Modal: TutorAvailabilityForm,
        mode: 'create',
        dataProp: 'newAvailability',

        createDraft: ({ start, end, userEmail }) => ({
            entityType: CalendarEntityType.AVAILABILITY,
            start,
            end,

            title: 'Availability', // optional polish
            tutor: userEmail,
            workType: 'tutoring',
            locationType: 'onsite',
        }),
    },

    [CalendarFlow.EDIT_AVAILABILITY]: {
        Modal: TutorAvailabilityForm,
        mode: 'edit',
        dataProp: 'newAvailability',
    },

    [CalendarFlow.VIEW_AVAILABILITY]: {
        Modal: TutorAvailabilityForm,
        mode: 'view',
        dataProp: 'newAvailability',
    },

    /* ─────────────────── STUDENT REQUESTS ──────────────────── */

    [CalendarFlow.CREATE_STUDENT_REQUEST]: {
        Modal: StudentEventForm,
        mode: 'create',
        dataProp: 'newEvent',

        createDraft: ({ start, end, userEmail }) => ({
            entityType: CalendarEntityType.STUDENT_REQUEST,
            start,
            end,

            students: [{ value: userEmail, label: userEmail }],
            staff: [],
            subject: null,
            preference: null,

            minStudents: 0,
            studentResponses: [],

            createdByStudent: true,
            approvalStatus: 'pending',
            isStudentRequest: true,
        }),
    },

    [CalendarFlow.EDIT_STUDENT_REQUEST]: {
        Modal: StudentEventForm,
        mode: 'edit',
        dataProp: 'newEvent',
    },

    [CalendarFlow.VIEW_STUDENT_REQUEST]: {
        Modal: StudentEventForm,
        mode: 'view',
        dataProp: 'newEvent',
    },
};


export default function useModalActionStrategy(calFlowType) {
    // Allow "no modal open" state
    if (!calFlowType) return null;

    const strategy = MODAL_ACTION_STRATEGY[calFlowType];

    if (!strategy) {
        throw new Error(
            `useModalActionStrategy: invalid CalendarFlow "${calFlowType}"`
        );
    }

    return strategy;
}
