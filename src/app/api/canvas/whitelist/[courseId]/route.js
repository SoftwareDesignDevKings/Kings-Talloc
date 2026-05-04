import { adminDb } from '@/firestore/firestoreAdmin';
import { getRequiredAdminOrTeacherSession } from '@/lib/security/serverAuth';

export async function DELETE(_req, { params }) {
    const { error } = await getRequiredAdminOrTeacherSession();
    if (error) return error;

    const { courseId } = await params;
    if (!courseId) {
        return Response.json({ message: 'courseId is required' }, { status: 400 });
    }

    const id = String(courseId);

    const [enrollmentsSnap] = await Promise.all([
        adminDb.collection('canvasEnrollments').where('courseId', '==', id).get(),
    ]);

    const writes = [
        { ref: adminDb.collection('canvasCourseWhitelist').doc(id) },
        { ref: adminDb.collection('canvasCourses').doc(id) },
        ...enrollmentsSnap.docs.map((doc) => ({ ref: doc.ref })),
    ];

    for (let i = 0; i < writes.length; i += 400) {
        const batch = adminDb.batch();
        writes.slice(i, i + 400).forEach(({ ref }) => batch.delete(ref));
        await batch.commit();
    }

    return Response.json({ message: `Course ${courseId} removed from whitelist and Firestore.` });
}
