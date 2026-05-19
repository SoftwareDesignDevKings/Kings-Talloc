const toStringId = (value) => {
    if (value === null || value === undefined) return '';
    return String(value);
};

export const getCanvasCoverageKey = (course) => {
    const blueprintId = toStringId(course?.blueprintCourseId ?? course?.blueprint_course_id);
    if (blueprintId) return `blueprint:${blueprintId}`;
    const courseId = toStringId(course?.id ?? course?.courseId ?? course?.course_id);
    return courseId ? `course:${courseId}` : '';
};

export const getCanvasCoverageType = (key) => {
    if (key?.startsWith('blueprint:')) return 'blueprint';
    if (key?.startsWith('course:')) return 'course';
    return '';
};

const formatCourseLabel = (course) => {
    const name = course?.name || '';
    const courseCode = course?.courseCode || course?.course_code || '';
    if (name && courseCode) return `${name} (${courseCode})`;
    return name || courseCode || toStringId(course?.id ?? course?.courseId ?? course?.course_id);
};

export const buildTutorCoverageOptionGroups = (courses = []) => {
    const blueprintsById = new Map();
    const courseOptions = [];

    courses.forEach((course) => {
        const courseId = toStringId(course.id ?? course.courseId ?? course.course_id);
        if (!courseId) return;

        const blueprintId = toStringId(course.blueprintCourseId ?? course.blueprint_course_id);
        if (blueprintId) {
            if (!blueprintsById.has(blueprintId)) {
                const courseCode = course.blueprintCourseCode || course.blueprint_course_code || '';
                const label = course.blueprintCourseName || course.blueprint_course_name || courseCode || `Blueprint ${blueprintId}`;
                blueprintsById.set(blueprintId, {
                    value: `blueprint:${blueprintId}`,
                    key: `blueprint:${blueprintId}`,
                    type: 'blueprint',
                    id: blueprintId,
                    label: courseCode && label !== courseCode ? `${label} (${courseCode})` : label,
                    courseCode,
                });
            }
            return;
        }

        courseOptions.push({
            value: `course:${courseId}`,
            key: `course:${courseId}`,
            type: 'course',
            id: courseId,
            label: formatCourseLabel(course),
            courseCode: course.courseCode || course.course_code || '',
        });
    });

    const byLabel = (a, b) => a.label.localeCompare(b.label);
    return [
        {
            label: 'Blueprints',
            options: [...blueprintsById.values()].sort(byLabel),
        },
        {
            label: 'Courses without blueprint',
            options: courseOptions.sort(byLabel),
        },
    ].filter((group) => group.options.length > 0);
};

export const flattenCoverageOptionGroups = (groups = []) =>
    groups.flatMap((group) => group.options || []);

export const serialiseTutorCoverage = (coverage = []) =>
    coverage
        .filter((item) => item?.key)
        .map(({ key, type, id, label, courseCode }) => ({
            key,
            type,
            id,
            label,
            ...(courseCode && { courseCode }),
        }));

export const hydrateTutorCoverage = (coverage = [], coverageKeys = [], options = []) => {
    const byKey = new Map(options.map((option) => [option.key, option]));
    const keys = coverageKeys.length ? coverageKeys : coverage.map((item) => item.key).filter(Boolean);

    return keys
        .map((key) => {
            const option = byKey.get(key);
            if (option) return option;
            const saved = coverage.find((item) => item.key === key);
            if (!saved) return null;
            return {
                ...saved,
                value: saved.key,
            };
        })
        .filter(Boolean);
};

export const hasTutorAccess = (user) => {
    const defaultRole = user?.defaultRole || user?.role;
    const userRoles = user?.userRoles || [];
    return defaultRole === 'tutor' || userRoles.includes('tutor');
};
