import { getRequiredSession } from '@/lib/security/serverAuth';
import { adminDb } from '@/firestore/firestoreAdmin';
import { readAvailability } from '@/lib/scheduling/readAvailability';
import { checkAvailabilityRateLimit } from '@/lib/security/availabilityRateLimit';
import { bookableIntervals, emailOf } from '@/lib/scheduling/eventRules';

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
        if (!Array.isArray(requestedStudents) || requestedStudents.length > 30 || requestedStudents.some(email => typeof email !== 'string' || email.length > 254 || !email.includes('@') || email.includes('/'))) return Response.json({ message: 'Choose a valid student group of up to 30 students.' }, { status: 400 });
        const group = [...new Set([emailOf(session.user.email), ...requestedStudents.map(emailOf)])];
        if (group.length > 30) return Response.json({ message: 'A group booking can include up to 30 students.' }, { status: 400 });
        const limited = await checkAvailabilityRateLimit(session.user.email);
        if (limited) return limited;
        const eligibility = student ? await Promise.all(group.map(email => adminDb.collection('studentTutorEligibility').doc(email).get())) : [];
        const eligibleEmails = student ? new Set((eligibility[0].data()?.eligibleTutorEmails || []).map(emailOf)
            .filter(email => eligibility.every(doc => (doc.data()?.eligibleTutorEmails || []).map(emailOf).includes(email)))) : null;
        if (eligibleEmails?.size === 0) return Response.json({ slots: [] }, { headers: { 'Cache-Control': 'no-store' } });
        const { tutors, shifts, availability } = await readAvailability(adminDb, start, end, eligibleEmails, student ? group : []);
        const slots = tutors.flatMap(email => bookableIntervals(email, availability, shifts, { students: student ? group : [] }))
            .filter(slot => slot.end > start && slot.start < end).map(slot => ({ id: slot.id, tutor: slot.tutor, start: new Date(Math.max(+slot.start, +start)), end: new Date(Math.min(+slot.end, +end)), locationType: slot.locationType }));
        return Response.json({ slots }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('Availability refresh failed', error);
        return Response.json({ message: 'Unable to refresh availability. Please retry.' }, { status: 503 });
    }
}
