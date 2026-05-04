import { adminDb } from '@/firestore/firestoreAdmin';
import { getRequiredAdminOrTeacherSession } from '@/lib/security/serverAuth';

export async function GET() {
    const { error } = await getRequiredAdminOrTeacherSession();
    if (error) return error;

    const snapshot = await adminDb.collection('canvasCourseWhitelist').orderBy('name').get();
    if (snapshot.empty) return Response.json([]);

    const courseIds = snapshot.docs.map((doc) => doc.id);
    const courseSnaps = await Promise.all(
        courseIds.map((id) => adminDb.collection('canvasCourses').doc(id).get()),
    );
    const courseDataById = new Map(
        courseSnaps
            .filter((d) => d.exists)
            .map((d) => [d.id, d.data()]),
    );

    const serializeTimestamp = (ts) => (ts?.toDate ? ts.toDate().toISOString() : ts ?? null);

    return Response.json(
        snapshot.docs.map((doc) => {
            const courseData = courseDataById.get(doc.id) ?? {};
            return {
                course_id: Number(doc.id),
                ...doc.data(),
                last_synced: serializeTimestamp(courseData.rosterSyncedAt ?? courseData.syncedAt ?? null),
                blueprint_course_id: courseData.blueprintCourseId ?? null,
                blueprint_course_name: courseData.blueprintCourseName ?? null,
                blueprint_course_code: courseData.blueprintCourseCode ?? null,
            };
        }),
    );
}

export async function POST(req) {
    const { session, error } = await getRequiredAdminOrTeacherSession();
    if (error) return error;

    const body = await req.json();
    const courseId = body.course_id ?? body.id;
    if (!courseId) {
        return Response.json({ message: 'course_id is required' }, { status: 400 });
    }

    const docId = String(courseId);
    const data = {
        courseId: docId,
        name: body.name || '',
        courseCode: body.course_code || body.courseCode || '',
        addedByEmail: session.user.email,
        addedAt: new Date(),
    };

    await adminDb.collection('canvasCourseWhitelist').doc(docId).set(data, { merge: true });
    return Response.json({ course_id: Number(docId), ...data });
}
