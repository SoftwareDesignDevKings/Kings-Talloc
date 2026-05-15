import {
    mapBlueprintSubscription,
    mapCanvasCourse,
    mapCanvasEnrollment,
    mapCanvasUserFromEnrollment,
    normalizeEmail,
} from '@/lib/canvas/canvasMappers';
import { getStaleEnrollmentIdsForDeletion } from '@/lib/canvas/canvasSyncPlanning';

describe('Canvas mappers', () => {
    const syncedAt = new Date('2026-05-04T10:00:00Z');

    test('maps Canvas courses with optional blueprint metadata', () => {
        const course = mapCanvasCourse(
            {
                id: 123,
                name: 'Mathematics Year 10',
                course_code: 'MATH10',
                workflow_state: 'available',
                account_id: 7,
                enrollment_term_id: 9,
                term: {
                    id: 9,
                    name: '2026 Term 2',
                    start_at: '2026-04-20T00:00:00Z',
                    end_at: '2026-06-26T23:59:59Z',
                },
                total_students: 28,
            },
            syncedAt,
            { id: 456, name: 'Mathematics Blueprint', course_code: 'MATH-BP' },
        );

        expect(course).toEqual({
            id: '123',
            name: 'Mathematics Year 10',
            courseCode: 'MATH10',
            workflowState: 'available',
            accountId: 7,
            termId: 9,
            termName: '2026 Term 2',
            termStartAt: '2026-04-20T00:00:00Z',
            termEndAt: '2026-06-26T23:59:59Z',
            totalStudents: 28,
            syncedAt,
            blueprintCourseId: '456',
            blueprintCourseName: 'Mathematics Blueprint',
            blueprintCourseCode: 'MATH-BP',
        });
    });

    test('maps first blueprint subscription course when present', () => {
        expect(mapBlueprintSubscription([
            {
                blueprint_course: {
                    id: 456,
                    name: 'Science Blueprint',
                    course_code: 'SCI-BP',
                },
            },
        ])).toEqual({
            id: 456,
            name: 'Science Blueprint',
            course_code: 'SCI-BP',
        });
    });

    test('maps Canvas users from enrollment and falls back SIS id to Canvas id', () => {
        const user = mapCanvasUserFromEnrollment({
            user: {
                id: 987,
                name: 'Jane Student',
                sortable_name: 'Student, Jane',
                email: 'Jane.Student@Example.edu',
            },
        }, syncedAt);

        expect(user).toEqual({
            id: '987',
            name: 'Jane Student',
            sortableName: 'Student, Jane',
            email: 'Jane.Student@Example.edu',
            emailLower: 'jane.student@example.edu',
            sisId: '987',
            syncedAt,
        });
    });

    test('maps enrollments and grade fields', () => {
        const enrollment = mapCanvasEnrollment({
            id: 555,
            type: 'StudentEnrollment',
            enrollment_state: 'active',
            last_activity_at: '2026-05-04T09:30:00Z',
            user: {
                id: 987,
                name: 'Jane Student',
                sortable_name: 'Student, Jane',
                email: 'jane@example.edu',
            },
            grades: {
                current_score: '86.5',
                current_grade: 'B',
                final_score: 84.1,
                final_grade: 'B',
            },
        }, 123, syncedAt);

        expect(enrollment).toMatchObject({
            id: '555',
            courseId: '123',
            userId: '987',
            userName: 'Jane Student',
            emailLower: 'jane@example.edu',
            role: 'StudentEnrollment',
            enrollmentState: 'active',
            currentScore: 86.5,
            currentGrade: 'B',
            finalScore: 84.1,
            finalGrade: 'B',
            syncedAt,
        });
    });

    test('normalizes email defensively', () => {
        expect(normalizeEmail('  Jane@Example.edu  ')).toBe('jane@example.edu');
        expect(normalizeEmail(null)).toBe('');
    });
});

describe('Canvas sync planning', () => {
    test('deletes missing enrollments during full sync', () => {
        expect(getStaleEnrollmentIdsForDeletion({
            existingEnrollmentIds: ['1', '2', '3'],
            seenEnrollmentIds: ['1', '3'],
            syncType: 'full',
        })).toEqual(['2']);
    });

    test('does not delete missing enrollments during incremental sync', () => {
        expect(getStaleEnrollmentIdsForDeletion({
            existingEnrollmentIds: ['1', '2', '3'],
            seenEnrollmentIds: ['1'],
            syncType: 'incremental',
        })).toEqual([]);
    });
});
