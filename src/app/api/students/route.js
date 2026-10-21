import { getRequiredSession } from '@/lib/security/serverAuth';
import { readStudentDirectory } from '@/lib/canvas/canvasReference';

// A bounded directory search: no full roster, grades, SIS IDs or enrollments.
export async function GET(request) {
    const { session, error } = await getRequiredSession();
    if (error) return error;
    const roles = [session.user.defaultRole || session.user.role, ...(session.user.userRoles || [])];
    if (!roles.some(role => ['student', 'teacher', 'admin'].includes(role))) return Response.json({ message: 'Forbidden' }, { status: 403 });
    const query = (new URL(request.url).searchParams.get('q') || '').trim().toLowerCase();
    if (query.length < 2 || query.length > 100) return Response.json({ message: 'Search by at least 2 letters of a student name or email.' }, { status: 400 });
    try {
        const directory = await readStudentDirectory();
        const students = directory.filter(student => student.name.toLowerCase().includes(query) || student.email.includes(query)).slice(0, 20);
        return Response.json({ students }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('Student search failed', error);
        return Response.json({ message: 'Unable to search students.' }, { status: 503 });
    }
}
