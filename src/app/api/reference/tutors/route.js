import { getRequiredSession } from '@/lib/security/serverAuth';
import { readTutorDirectory } from '@/lib/scheduling/tutorDirectory';

// Tutors and coaches with their roles (cached server-side).
export async function GET() {
    const { error } = await getRequiredSession();
    if (error) return error;
    try {
        return Response.json({ tutors: await readTutorDirectory() }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('Tutor directory failed', error);
        return Response.json({ message: 'Unable to load tutors.' }, { status: 503 });
    }
}
