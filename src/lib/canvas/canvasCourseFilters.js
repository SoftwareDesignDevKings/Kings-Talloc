const parseCanvasDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const getCurrentCalendarYear = () => new Date().getFullYear();

export const courseTermOverlapsYear = (course, year = getCurrentCalendarYear()) => {
    const term = course?.term;
    if (!term) return false;

    const startAt = parseCanvasDate(term.start_at);
    const endAt = parseCanvasDate(term.end_at);
    if (!startAt && !endAt) return false;

    const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    return (!startAt || startAt <= yearEnd) && (!endAt || endAt >= yearStart);
};

export const filterCoursesByCurrentYearTerm = (courses, year = getCurrentCalendarYear()) =>
    courses.filter((course) => courseTermOverlapsYear(course, year));
