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
        let requestedStudents;
        try { requestedStudents = JSON.parse(params.get('students') || '[]'); } catch { return Response.json({ message: 'Choose a valid student group.' }, { status: 400 }); }
        if (!Array.isArray(requestedStudents) || requestedStudents.length > 30 || requestedStudents.some(email => typeof email !== 'string' || !email.includes('@') || email.includes('/'))) return Response.json({ message: 'Choose a valid student group of up to 30 students.' }, { status: 400 });
        const group = [...new Set([emailOf(session.user.email), ...requestedStudents.map(emailOf)])];
        if (group.length > 30) return Response.json({ message: 'A group booking can include up to 30 students.' }, { status: 400 });
        const [shifts, availability, eligibility, users] = await Promise.all([
            readSchedule(adminDb, start, end),
            adminDb.collection('tutorAvailabilities').where('end', '>', start).get(),
            student ? Promise.all(group.map(email => adminDb.collection('studentTutorEligibility').doc(email).get())) : Promise.resolve([]),
            adminDb.collection('users').get(),
        ]);
        const eligible = email => eligibility.every(doc => (doc.data()?.eligibleTutorEmails || []).map(emailOf).includes(email));
        const tutors = users.docs.filter(doc => hasTutorAccess(doc.data())).map(doc => emailOf(doc.data().email || doc.id)).filter(email => !student || eligible(email));
        const slots = tutors.flatMap(email => bookableIntervals(email, availability.docs.map(documentEvent), shifts))
            .filter(slot => slot.end > start && slot.start < end).map(slot => ({ id: slot.id, tutor: slot.tutor, start: new Date(Math.max(+slot.start, +start)), end: new Date(Math.min(+slot.end, +end)), locationType: slot.locationType }));
        return Response.json({ slots }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('Availability refresh failed', error);
        return Response.json({ message: 'Unable to refresh availability. Please retry.' }, { status: 503 });
    }
}
