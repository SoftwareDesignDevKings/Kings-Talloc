import { getRequiredSession } from '@/lib/security/serverAuth';
import { adminDb } from '@/firestore/firestoreAdmin';
import { scheduleMutation } from '@/lib/scheduling/service';
import { invalidateAvailability } from '@/lib/scheduling/availabilityCache';

export async function POST(request) {
    const { session, error } = await getRequiredSession();
    if (error) return error;
    // Calendar mutations use the existing same-origin, HttpOnly session.
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) return Response.json({ message: 'Forbidden' }, { status: 403 });
    try {
        const input = await request.json();
        return Response.json(await scheduleMutation(adminDb, session.user, input), { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        if (!error.status) console.error('Scheduling operation failed', error);
        return Response.json({ message: error.status ? error.message : 'The change could not be saved. Please retry.', ...error.details }, { status: error.status || 500 });
    } finally {
        // Also after errors: a commit may have succeeded before a later failure.
        await invalidateAvailability();
    }
}
