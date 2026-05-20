import { listCanvasStudents } from '@/lib/canvas/canvasReferenceData';
import { getRequiredAdminOrTeacherSession } from '@/lib/security/serverAuth';

export async function GET() {
    const { error } = await getRequiredAdminOrTeacherSession();
    if (error) return error;

    return Response.json(await listCanvasStudents());
}
