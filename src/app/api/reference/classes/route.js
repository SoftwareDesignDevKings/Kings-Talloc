import { getRequiredAdminOrTeacherSession } from '@/lib/security/serverAuth';
import { readClassDirectory } from '@/lib/canvas/canvasReference';

// Whitelisted Canvas courses and rosters for staff (cached server-side).
export async function GET() {
    const { error } = await getRequiredAdminOrTeacherSession();
    if (error) return error;
    try {
        return Response.json({ classes: await readClassDirectory() }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('Class directory failed', error);
        return Response.json({ message: 'Unable to load classes.' }, { status: 503 });
    }
}
