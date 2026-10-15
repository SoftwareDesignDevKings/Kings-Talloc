import { DateTime } from 'luxon';

export const SYDNEY_ZONE = 'Australia/Sydney';
export const APPROVAL_GRACE_MS = 15 * 60 * 1000;
export const asDate = value => value?.toDate ? value.toDate() : value?.toJSDate ? value.toJSDate() : new Date(value);
export const emailOf = value => String(value?.value || value?.email || value || '').trim().toLowerCase();
export const staffEmails = event => [...new Set((event.staff || []).map(emailOf).filter(Boolean))];
export const workCategory = event => event.workType === 'coaching' ? 'coaching' : 'work';
// Class-linked legacy bookings are occupied until their participants can be resolved.
export const isStudentSession = event => workCategory(event) === 'work' &&
    Boolean(event.students?.length || event.additionalStudents?.length || (event.classes?.length && !event.studentParticipantsResolved));
export const isGeneralWork = event => workCategory(event) === 'work' && !isStudentSession(event);
export const isApproved = event => !event.createdByStudent || event.approvalStatus === 'approved';
export const canApproveAt = (event, now = Date.now()) => event.approvalStatus === 'pending' &&
    now <= asDate(event.start).getTime() + APPROVAL_GRACE_MS;
export const isAcademicAvailability = event => {
    const types = Array.isArray(event.workType) ? event.workType : [event.workType];
    return !types.includes('coaching') || types.some(type => ['work', 'tutoring', 'tutoringOrWork'].includes(type));
};
export const overlaps = (a, b) => asDate(a.start) < asDate(b.end) && asDate(a.end) > asDate(b.start);
export const commitmentsConflict = (a, b) => overlaps(a, b) &&
    (workCategory(a) === 'coaching' || workCategory(b) === 'coaching' || (isStudentSession(a) && isStudentSession(b)));

export const unionIntervals = intervals => {
    const result = [];
    for (const interval of intervals.map(i => ({ start: +asDate(i.start), end: +asDate(i.end) }))
        .filter(i => Number.isFinite(i.start) && Number.isFinite(i.end) && i.end > i.start)
        .sort((a, b) => a.start - b.start || a.end - b.end)) {
        const last = result[result.length - 1];
        if (last && interval.start <= last.end) last.end = Math.max(last.end, interval.end);
        else result.push({ ...interval });
    }
    return result;
};
export const rangeCovered = (start, end, intervals) => +asDate(end) > +asDate(start) &&
    unionIntervals(intervals).some(i => i.start <= +asDate(start) && i.end >= +asDate(end));

export const bookableIntervals = (tutor, availabilities, shifts) => {
    const email = emailOf(tutor);
    const ownShifts = shifts.filter(s => staffEmails(s).includes(email) && isApproved(s));
    const sources = [
        ...availabilities.filter(a => emailOf(a.tutor) === email && isAcademicAvailability(a)),
        ...ownShifts.filter(isGeneralWork),
    ].map(source => ({ start: +asDate(source.start), end: +asDate(source.end), locationType: source.locationType || 'onsite' }))
        .filter(source => Number.isFinite(source.start) && Number.isFinite(source.end) && source.end > source.start);
    const busy = unionIntervals(ownShifts.filter(s => !isGeneralWork(s)));
    const boundaries = [...new Set([...sources, ...busy].flatMap(slot => [slot.start, slot.end]))].sort((a, b) => a - b);
    const free = [];
    for (let index = 0; index < boundaries.length - 1; index++) {
        const start = boundaries[index], end = boundaries[index + 1];
        if (busy.some(block => block.start < end && block.end > start)) continue;
        const locations = [...new Set(sources.filter(source => source.start <= start && source.end >= end).map(source => source.locationType))].sort();
        for (const locationType of locations) {
            const last = free.findLast(slot => slot.locationType === locationType);
            if (last?.end === start) last.end = end;
            else free.push({ start, end, locationType });
        }
    }
    return free.map((slot, index) => ({ ...slot, start: new Date(slot.start), end: new Date(slot.end),
        tutor: email, id: `free:${email}:${index}:${slot.start}` }));
};

// Pure and server-safe. Preserve Sydney wall time across daylight-saving changes.
export const expandRecurringEvents = (events, { rangeStart = new Date(), rangeEnd = new Date(Date.now() + 366 * 86400000), maxOccurrences = 52 } = {}) => {
    const result = [];
    for (const raw of events) {
        const event = { ...raw, start: asDate(raw.start), end: asDate(raw.end) };
        if (!event.recurring) { result.push(event); continue; }
        const weeks = event.recurring === 'weekly' ? 1 : 2;
        const count = Number(event.occurenceNum) || Math.max(Math.floor(maxOccurrences / weeks), Math.ceil(DateTime.fromJSDate(asDate(rangeEnd), { zone: SYDNEY_ZONE }).diff(DateTime.fromJSDate(event.start, { zone: SYDNEY_ZONE }), 'weeks').weeks / weeks));
        const start = DateTime.fromJSDate(event.start, { zone: SYDNEY_ZONE });
        const end = DateTime.fromJSDate(event.end, { zone: SYDNEY_ZONE });
        for (let index = 0; index < count; index++) {
            const occurrenceStart = start.plus({ weeks: index * weeks }).toJSDate();
            if (occurrenceStart >= asDate(rangeEnd) || (event.until && occurrenceStart > asDate(event.until))) break;
            if (occurrenceStart < asDate(rangeStart) || event.eventExceptions?.includes(index)) continue;
            result.push({ ...event, start: occurrenceStart, end: end.plus({ weeks: index * weeks }).toJSDate(),
                recurringEventId: event.id, id: `${event.id}_occurrence_${index}`, isRecurringInstance: true, occurrenceIndex: index });
        }
    }
    return result;
};
