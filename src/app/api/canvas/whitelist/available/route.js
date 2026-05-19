import { createCanvasClient } from '@/lib/canvas/canvasClient';
import { filterCoursesByCurrentYearTerm } from '@/lib/canvas/canvasCourseFilters';
import { getRequiredAdminSession } from '@/lib/security/serverAuth';

export async function GET() {
    const { error } = await getRequiredAdminSession();
    if (error) return error;

    try {
        const courses = await createCanvasClient().listCourses();
        return Response.json(
            filterCoursesByCurrentYearTerm(courses)
                .map((course) => ({
                    id: Number(course.id),
                    name: course.name || '',
                    course_code: course.course_code || '',
                    workflow_state: course.workflow_state || '',
                    term_id: course.enrollment_term_id ?? course.term?.id ?? null,
                    term_name: course.term?.name || '',
                    term_start_at: course.term?.start_at || null,
                    term_end_at: course.term?.end_at || null,
                }))
                .sort((a, b) => a.name.localeCompare(b.name)),
        );
    } catch (err) {
        return Response.json({ message: err.message }, { status: err.status || 500 });
    }
}
