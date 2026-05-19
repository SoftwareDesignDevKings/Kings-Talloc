jest.mock('server-only', () => ({}), { virtual: true });
jest.mock('@/firestore/firestoreAdmin', () => ({ adminDb: {} }));

const { buildStudentTutorEligibility } = require('@/lib/canvas/tutorEligibility');

describe('tutorEligibility', () => {
    test('maps student enrollments to tutors by blueprint and course fallback coverage', () => {
        const eligibility = buildStudentTutorEligibility({
            courses: [
                {
                    id: '101',
                    name: '12SENX1',
                    blueprintCourseId: '900',
                    blueprintCourseName: 'Software Engineering',
                    blueprintCourseCode: 'BP_12SEN',
                },
                {
                    id: '102',
                    name: '11SENX1',
                    blueprintCourseId: '901',
                    blueprintCourseName: 'Software Engineering',
                    blueprintCourseCode: 'BP_11SEN',
                },
                {
                    id: '201',
                    name: 'Robotics',
                },
            ],
            enrollments: [
                { courseId: '101', emailLower: 'student@kings.edu.au' },
                { courseId: '102', emailLower: 'student@kings.edu.au' },
                { courseId: '201', emailLower: 'other@kings.edu.au' },
            ],
            users: [
                {
                    email: 'senx-tutor@kings.edu.au',
                    defaultRole: 'tutor',
                    userRoles: [],
                    tutorCoverageKeys: ['blueprint:900', 'blueprint:901'],
                },
                {
                    email: 'robotics-tutor@kings.edu.au',
                    defaultRole: 'tutor',
                    userRoles: [],
                    tutorCoverageKeys: ['course:201'],
                },
                {
                    email: 'unassigned@kings.edu.au',
                    defaultRole: 'tutor',
                    userRoles: [],
                    tutorCoverageKeys: [],
                },
            ],
        });

        expect(eligibility).toEqual([
            {
                studentEmail: 'student@kings.edu.au',
                coverageKeys: ['blueprint:900', 'blueprint:901'],
                eligibleTutorEmails: ['senx-tutor@kings.edu.au'],
                eligibleTutors: [{
                    email: 'senx-tutor@kings.edu.au',
                    subjectCodes: ['SEN'],
                }],
            },
            {
                studentEmail: 'other@kings.edu.au',
                coverageKeys: ['course:201'],
                eligibleTutorEmails: ['robotics-tutor@kings.edu.au'],
                eligibleTutors: [{
                    email: 'robotics-tutor@kings.edu.au',
                    subjectCodes: [],
                }],
            },
        ]);
    });
});
