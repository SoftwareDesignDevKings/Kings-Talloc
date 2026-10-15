import { DateTime } from 'luxon';
import { asDate, emailOf, staffEmails, isStudentSession, isApproved, workCategory, unionIntervals, SYDNEY_ZONE } from './eventRules';

const HOUR = 3600000;
export const breakDeductionMs = duration => duration > 6 * HOUR ? HOUR : duration > 3 * HOUR ? HOUR / 2 : 0;
export const formatDuration = milliseconds => {
    const minutes = milliseconds / 60000;
    return `${Math.floor(minutes / 60)}h ${Number((minutes % 60).toFixed(6))}m`;
};
export const decimalHours = milliseconds => String(milliseconds / HOUR);

/** One calculation for completed staff-hours, summary, dashboard and exports. */
export const calculateHours = (events, { completedOnly = true } = {}) => {
    const buckets = new Map();
    for (const event of events) {
        if (!isApproved(event) || (completedOnly && event.workStatus !== 'completed')) continue;
        const start = +asDate(event.start), end = +asDate(event.end);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
        const date = DateTime.fromMillis(start, { zone: SYDNEY_ZONE }).toISODate();
        const category = workCategory(event);
        for (const email of staffEmails(event)) {
            const key = `${email}|${date}|${category}`;
            const bucket = buckets.get(key) || { email, date, category, events: [] };
            bucket.events.push({ ...event, start, end });
            buckets.set(key, bucket);
        }
    }
    const days = [];
    for (const bucket of buckets.values()) {
        const sorted = bucket.events.sort((a, b) => a.start - b.start || a.end - b.end);
        const parents = sorted.map((_, index) => index);
        const find = index => parents[index] === index ? index : (parents[index] = find(parents[index]));
        if (bucket.category === 'work') {
            for (let a = 0; a < sorted.length; a++) for (let b = a + 1; b < sorted.length; b++) {
                const overlap = sorted[b].start < sorted[a].end;
                const adjoining = sorted[b].start === sorted[a].end;
                if (overlap || (adjoining && (!isStudentSession(sorted[a]) || !isStudentSession(sorted[b])))) parents[find(b)] = find(a);
            }
        }
        const grouped = new Map();
        sorted.forEach((event, index) => { const root = find(index); grouped.set(root, [...(grouped.get(root) || []), event]); });
        const groups = [...grouped.values()].map(entries => {
            const intervals = bucket.category === 'work' ? unionIntervals(entries) : entries;
            const grossMs = intervals.reduce((sum, interval) => sum + interval.end - interval.start, 0);
            const deductionMs = breakDeductionMs(grossMs);
            return { start: Math.min(...entries.map(e => e.start)), end: Math.max(...entries.map(e => e.end)),
                grossMs, deductionMs, paidMs: grossMs - deductionMs, events: entries };
        });
        const grossMs = groups.reduce((sum, group) => sum + group.grossMs, 0);
        const deductionMs = groups.reduce((sum, group) => sum + group.deductionMs, 0);
        const warnings = [];
        const minimum = (bucket.category === 'coaching' ? 2 : 3) * HOUR;
        if (groups.some(group => group.grossMs < minimum)) warnings.push({ code: 'short-shift', message: `${bucket.category === 'work' ? 'Work is under 3 hours' : 'Coaching is under 2 hours'}; check manually.` });
        const mixedChain = sorted.length > 2 && sorted.some(isStudentSession) && sorted.some(e => !isStudentSession(e)) &&
            !sorted.some(e => !isStudentSession(e) && e.start <= sorted[0].start && e.end >= Math.max(...sorted.map(s => s.end)));
        const overlappingBookings = sorted.some((event, index) => isStudentSession(event) && sorted.slice(index + 1).some(other => isStudentSession(other) && other.start < event.end));
        if (groups.length > 1 || mixedChain || overlappingBookings || sorted.some(e => e.classes?.length && !e.students?.length)) {
            warnings.push({ code: 'complex-day', message: 'Complex day: check start, finish, breaks and paid hours manually. A teacher can record one covering Work shift where appropriate.' });
        }
        // If a day's separate short sessions total at least the minimum, the complex warning explains it.
        if (groups.length > 1 && grossMs >= minimum) {
            const short = warnings.findIndex(warning => warning.code === 'short-shift');
            if (short >= 0) warnings.splice(short, 1);
        }
        days.push({ ...bucket, start: new Date(Math.min(...sorted.map(e => e.start))), end: new Date(Math.max(...sorted.map(e => e.end))),
            groups, grossMs, deductionMs, paidMs: grossMs - deductionMs, warnings });
    }
    days.sort((a, b) => a.date.localeCompare(b.date) || a.email.localeCompare(b.email) || a.category.localeCompare(b.category));
    const tutors = new Map();
    for (const day of days) {
        const tutor = tutors.get(day.email) || { email: day.email, name: day.email, workMs: 0, coachingMs: 0, warnings: [], days: [] };
        const staff = day.events.flatMap(event => event.staff || []).find(member => emailOf(member) === day.email);
        tutor.name = staff?.label || staff?.name || tutor.name;
        tutor[day.category === 'coaching' ? 'coachingMs' : 'workMs'] += day.paidMs;
        tutor.warnings.push(...day.warnings.map(warning => ({ ...warning, date: day.date, category: day.category })));
        tutor.days.push(day);
        tutors.set(day.email, tutor);
    }
    return { days, tutors: [...tutors.values()], paidMs: days.reduce((sum, day) => sum + day.paidMs, 0) };
};
