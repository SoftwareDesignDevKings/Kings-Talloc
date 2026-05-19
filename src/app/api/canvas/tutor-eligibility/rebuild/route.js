import { rebuildStudentTutorEligibility } from '@/lib/canvas/tutorEligibility';
import { getRequiredAdminSession } from '@/lib/security/serverAuth';

export async function POST() {
    const { error } = await getRequiredAdminSession();
    if (error) return error;

    try {
        const result = await rebuildStudentTutorEligibility();
        return Response.json({ status: 'success', ...result });
    } catch (err) {
        return Response.json({ status: 'failed', message: err.message }, { status: 500 });
    }
}
