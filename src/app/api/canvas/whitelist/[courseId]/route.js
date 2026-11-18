import { adminDb } from '@/firestore/firestoreAdmin';
import { getRequiredAdminSession } from '@/lib/security/serverAuth';
import { invalidateCanvas } from '@/lib/canvas/canvasCache';
import { rebuildStudentTutorEligibility } from '@/lib/canvas/tutorEligibility';

export async function DELETE(_req, { params }) {
    const { error } = await getRequiredAdminSession();
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
    await invalidateCanvas();

    // Students keep booking this course's tutors until eligibility is rebuilt from the
    // remaining rosters, so do it now rather than waiting for the next full sync.
    try {
        await rebuildStudentTutorEligibility();
    } catch (rebuildError) {
        console.error('Eligibility rebuild after course removal failed:', rebuildError);
        return Response.json({ message: `Course ${courseId} removed, but student tutor eligibility could not be refreshed. Run the Canvas eligibility rebuild.` });
    }

    return Response.json({ message: `Course ${courseId} removed from whitelist and Firestore.` });
}
