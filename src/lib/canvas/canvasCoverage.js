const toStringId = (value) => {
    if (value === null || value === undefined) return '';
    return String(value);
};

export const parseBlueprintCourseCode = (courseCode) => {
    const match = toStringId(courseCode).trim().match(/^BP_(\d+)([a-z0-9]+)$/i);
    if (!match) return null;

    const year = match[1];
    const subjectCode = match[2].toUpperCase();
    return {
        classCode: `${year}${subjectCode}`,
        subjectCode,
    };
};

export const formatBlueprintCoverageLabel = ({ blueprintCourseName, blueprintCourseCode, fallbackId } = {}) => {
    const parsed = parseBlueprintCourseCode(blueprintCourseCode);
    if (parsed?.classCode) return parsed.classCode;

    const fallbackName = toStringId(blueprintCourseName).replace(/^Blueprint\s+/i, '').trim();
    const code = toStringId(blueprintCourseCode).trim();
    if (fallbackName && code && fallbackName !== code) return `${fallbackName} (${code})`;
    return fallbackName || code || `Blueprint ${toStringId(fallbackId)}`;
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
                blueprintsById.set(blueprintId, {
                    value: `blueprint:${blueprintId}`,
                    key: `blueprint:${blueprintId}`,
                    type: 'blueprint',
                    id: blueprintId,
                    label: formatBlueprintCoverageLabel({
                        blueprintCourseName: course.blueprintCourseName || course.blueprint_course_name,
                        blueprintCourseCode: courseCode,
                        fallbackId: blueprintId,
                    }),
                    courseCode,
                    subjectCode: parseBlueprintCourseCode(courseCode)?.subjectCode || '',
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

const normaliseEmail = (email) => (typeof email === 'string' ? email.toLowerCase() : '');

export const formatTutorSubjectLabel = (baseLabel, subjectCodes = []) => {
    const uniqueSubjectCodes = [...new Set(subjectCodes.filter(Boolean))].sort();
    return uniqueSubjectCodes.length
        ? `${baseLabel} (${uniqueSubjectCodes.join(', ')})`
        : baseLabel;
};

export const buildEligibleTutorOptions = (tutors = [], studentTutorEligibility = {}) => {
    const eligibleTutorEmails = new Set((studentTutorEligibility.eligibleTutorEmails || []).map(normaliseEmail));
    const eligibleTutorDetails = new Map(
        (studentTutorEligibility.eligibleTutors || []).map((tutor) => [
            normaliseEmail(tutor.email),
            tutor.subjectCodes || [],
        ]),
    );

    return tutors
        .filter((tutor) => eligibleTutorEmails.has(normaliseEmail(tutor.email)))
        .map((tutor) => {
            const emailKey = normaliseEmail(tutor.email);
            const baseLabel = tutor.name || tutor.email;
            return {
                value: tutor.email,
                label: formatTutorSubjectLabel(baseLabel, eligibleTutorDetails.get(emailKey) || []),
            };
        });
};
