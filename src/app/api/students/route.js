import { getRequiredSession } from '@/lib/security/serverAuth';
import { adminDb } from '@/firestore/firestoreAdmin';
import { emailOf } from '@/lib/scheduling/eventRules';

// A bounded directory search: no full roster, grades, SIS IDs or enrollments.
let cachedDirectory = null;
let cachedAt = 0;
export async function GET(request) {
    const { session, error } = await getRequiredSession();
    if (error) return error;
    const roles = [session.user.defaultRole || session.user.role, ...(session.user.userRoles || [])];
    if (!roles.some(role => ['student', 'teacher', 'admin'].includes(role))) return Response.json({ message: 'Forbidden' }, { status: 403 });
    const query = (new URL(request.url).searchParams.get('q') || '').trim().toLowerCase();
    if (query.length < 2 || query.length > 100) return Response.json({ message: 'Search by at least 2 letters of a student name or email.' }, { status: 400 });
    try {
        if (!cachedDirectory || Date.now() - cachedAt > 30000) {
            const snapshot = await adminDb.collection('canvasUsers').select('email', 'name').get();
            cachedDirectory = [...new Map(snapshot.docs.map(doc => {
                const data = doc.data();
                const email = emailOf(data.email);
                return [email, { email, name: data.name || email }];
            }).filter(([email]) => email.includes('@'))).values()].sort((a, b) => a.name.localeCompare(b.name));
            cachedAt = Date.now();
        }
        const students = cachedDirectory.filter(student => student.name.toLowerCase().includes(query) || student.email.includes(query)).slice(0, 20);
        return Response.json({ students }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('Student search failed', error);
        return Response.json({ message: 'Unable to search students.' }, { status: 503 });
    }
}
