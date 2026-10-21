import { getRequiredSession } from '@/lib/security/serverAuth';
import { readStudentEligibility } from '@/lib/canvas/canvasReference';

// The signed-in student's own tutor eligibility (cached server-side).
export async function GET() {
    const { session, error } = await getRequiredSession();
    if (error) return error;
    try {
        return Response.json({ eligibility: await readStudentEligibility(session.user.email) }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('Eligibility lookup failed', error);
        return Response.json({ message: 'Unable to load tutor eligibility.' }, { status: 503 });
    }
}
