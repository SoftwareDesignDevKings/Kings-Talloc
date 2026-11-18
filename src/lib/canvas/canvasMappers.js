const toStringId = (value) => {
    if (value === null || value === undefined) return '';
    return String(value);
};

export const normalizeEmail = (email) =>
    typeof email === 'string' ? email.trim().toLowerCase() : '';

export const mapCanvasCourse = (course, syncedAt = new Date(), blueprint = null) => ({
    id: toStringId(course.id),
    name: course.name || '',
    courseCode: course.course_code || '',
    workflowState: course.workflow_state || '',
    accountId: course.account_id ?? null,
    termId: course.enrollment_term_id ?? course.term?.id ?? null,
    termName: course.term?.name || '',
    termStartAt: course.term?.start_at || null,
    termEndAt: course.term?.end_at || null,
    totalStudents: course.total_students ?? null,
    syncedAt,
    ...(blueprint?.id && { blueprintCourseId: toStringId(blueprint.id) }),
    ...(blueprint?.name && { blueprintCourseName: blueprint.name }),
    ...(blueprint?.course_code && { blueprintCourseCode: blueprint.course_code }),
});

export const mapBlueprintSubscription = (subscriptions) => {
    if (!Array.isArray(subscriptions) || subscriptions.length === 0) return null;
    const blueprintCourse = subscriptions[0]?.blueprint_course;
    if (!blueprintCourse?.id) return null;
    return blueprintCourse;
};

export const mapCanvasUserFromEnrollment = (enrollment, syncedAt = new Date()) => {
    const user = enrollment.user || {};
    const id = toStringId(user.id);
    return {
        id,
        name: user.name || '',
        sortableName: user.sortable_name || '',
        email: user.email || '',
        emailLower: normalizeEmail(user.email),
        syncedAt,
    };
};

export const mapCanvasEnrollment = (enrollment, courseId, syncedAt = new Date()) => {
    const user = enrollment.user || {};
    const userId = toStringId(user.id);
    return {
        id: toStringId(enrollment.id),
        courseId: toStringId(courseId),
        userId,
        userName: user.name || '',
        sortableName: user.sortable_name || '',
        email: user.email || '',
        emailLower: normalizeEmail(user.email),
        role: enrollment.type || '',
        enrollmentState: enrollment.enrollment_state || '',
        // Roster fields only: grades and activity are deliberately not kept.
        syncedAt,
    };
};

export const mapCourseForApi = (course, studentCount = 0) => ({
    id: Number(course.id),
    name: course.name || '',
    course_code: course.courseCode || '',
    workflow_state: course.workflowState || '',
    last_synced: course.syncedAt?.toDate
        ? course.syncedAt.toDate().toISOString()
        : course.syncedAt || null,
    student_count: studentCount,
    term_id: course.termId ?? null,
    term_name: course.termName || '',
    term_start_at: course.termStartAt || null,
    term_end_at: course.termEndAt || null,
    blueprint_course_id: course.blueprintCourseId ? Number(course.blueprintCourseId) : null,
    blueprint_course_name: course.blueprintCourseName || null,
    blueprint_course_code: course.blueprintCourseCode || null,
});
