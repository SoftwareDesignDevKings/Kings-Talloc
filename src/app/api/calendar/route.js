import crypto from 'crypto';
import { adminDb } from '@/firestore/firestoreAdmin';
import { getRequiredSession } from '@/lib/security/serverAuth';

export async function GET() {
    const { session, error } = await getRequiredSession();
    if (error) return error;
    const email = session.user.email;
    const version = session.user.authVersion || '';
    const ref = adminDb.collection('calendarFeedSecrets').doc(email);
    // Rotate lazily, but never accept a token exposed in a legacy public profile.
    const calendarFeedToken = await adminDb.runTransaction(async transaction => {
        const snapshot = await transaction.get(ref);
        const data = snapshot.data();
        if (data?.token && data.authVersion === version) return data.token;
        const token = crypto.randomBytes(32).toString('hex');
        transaction.set(ref, { token, authVersion: version });
        return token;
    });
    const baseUrl = process.env.NEXTAUTH_URL || 'https://talloc.kings.edu.au';
    const query = new URLSearchParams({ uid: email, token: calendarFeedToken });
    const httpsUrl = `${baseUrl}/api/calendar/feed?${query}`;
    return Response.json({ httpsUrl, webcalUrl: httpsUrl.replace(/^https:/, 'webcal:') }, {
        headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
    });
}
