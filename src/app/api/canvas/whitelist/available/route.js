import { createCanvasClient } from '@/lib/canvas/canvasClient';
import { getRequiredAdminOrTeacherSession } from '@/lib/security/serverAuth';

export async function GET() {
    const { error } = await getRequiredAdminOrTeacherSession();
    if (error) return error;

    try {
        const courses = await createCanvasClient().listCourses();
        return Response.json(
            courses
                .map((course) => ({
                    id: Number(course.id),
                    name: course.name || '',
                    course_code: course.course_code || '',
                    workflow_state: course.workflow_state || '',
                }))
                .sort((a, b) => a.name.localeCompare(b.name)),
        );
    } catch (err) {
        return Response.json({ message: err.message }, { status: err.status || 500 });
    }
}
