import { getRequiredSession } from '@/lib/security/serverAuth';
import { adminDb } from '@/firestore/firestoreAdmin';
import { readSchedule, documentEvent } from '@/lib/scheduling/readSchedule';
import { bookableIntervals, emailOf } from '@/lib/scheduling/eventRules';
import { hasTutorAccess } from '@/lib/canvas/canvasCoverage';

export async function GET(request) {
    const { session, error } = await getRequiredSession();
    if (error) return error;
    try {
        const params = new URL(request.url).searchParams;
        const start = new Date(params.get('start')), end = new Date(params.get('end'));
        if (!params.get('start') || !params.get('end') || !Number.isFinite(+start) || !Number.isFinite(+end) || end <= start || end - start > 62 * 86400000) return Response.json({ message: 'Choose a date range of up to 62 days.' }, { status: 400 });
        const roles = [session.user.defaultRole || session.user.role, ...(session.user.userRoles || [])];
        const student = roles.includes('student') && !roles.some(role => ['teacher', 'admin'].includes(role));
        const [shifts, availability, eligibility, users] = await Promise.all([
            readSchedule(adminDb, start, end),
            adminDb.collection('tutorAvailabilities').where('end', '>', start).get(),
            student ? adminDb.collection('studentTutorEligibility').doc(emailOf(session.user.email)).get() : Promise.resolve(null),
            adminDb.collection('users').get(),
        ]);
        const eligible = new Set((eligibility?.data()?.eligibleTutorEmails || []).map(emailOf));
        const tutors = users.docs.filter(doc => hasTutorAccess(doc.data())).map(doc => emailOf(doc.data().email || doc.id)).filter(email => !student || eligible.has(email));
        const slots = tutors.flatMap(email => bookableIntervals(email, availability.docs.map(documentEvent), shifts))
            .filter(slot => slot.end > start && slot.start < end).map(slot => ({ id: slot.id, tutor: slot.tutor, start: new Date(Math.max(+slot.start, +start)), end: new Date(Math.min(+slot.end, +end)), locationType: slot.locationType }));
        return Response.json({ slots }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('Availability refresh failed', error);
        return Response.json({ message: 'Unable to refresh availability. Please retry.' }, { status: 503 });
    }
}
