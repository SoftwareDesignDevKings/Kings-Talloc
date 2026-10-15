import { calculateHours, breakDeductionMs } from '@/lib/scheduling/hours';
import { bookableIntervals, rangeCovered, commitmentsConflict, canApproveAt, expandRecurringEvents } from '@/lib/scheduling/eventRules';
const HOUR = 3600000;
const date = (hour, day = '2026-10-12') => new Date(`${day}T${String(Math.floor(hour)).padStart(2, '0')}:${String((hour % 1) * 60).padStart(2, '0')}:00+11:00`);
const event = (start, end, student = false, extra = {}) => ({ id: Math.random().toString(), start: date(start), end: date(end), staff: [{ value: 'tutor@school.test' }], students: student ? [{ value: 'student@school.test' }] : [], workType: 'work', workStatus: 'completed', ...extra });
const paid = events => calculateHours(events).paidMs / HOUR;
test.each([
    [[event(13, 15), event(14, 16)], 3],
    [[event(15, 17), event(15.5, 16, true)], 2],
    [[event(15, 17), event(16.5, 17.5, true)], 2.5],
    [[event(9, 11), event(11, 13)], 3.5],
    [[event(9, 11, true), event(11, 13, true)], 4],
    [[event(9, 11), event(11, 13, true)], 3.5],
    [[event(9, 12), event(12.5, 15.5)], 6],
    [[event(8, 12), event(13, 17)], 7],
    [[event(9, 13, true)], 3.5],
    [[event(9, 15)], 5.5],
    [[event(9, 15.25)], 5.25],
    [[event(15, 17, false, { workStatus: 'notCompleted' }), event(15.5, 16, true)], 0.5],
    [[event(9, 11, true), event(11, 13, true), event(13, 14), event(9, 14)], 4.5],
])('paid interval fixtures %#', (events, expected) => expect(paid(events)).toBe(expected));
test('break boundaries are exact', () => { expect(breakDeductionMs(3 * HOUR)).toBe(0); expect(breakDeductionMs(3 * HOUR + 1)).toBe(HOUR / 2); expect(breakDeductionMs(6 * HOUR + 1)).toBe(HOUR); });
test('legacy confirmation ignored, denied requests excluded', () => expect(paid([event(9, 12, false, { confirmationRequired: true }), event(13, 16, true, { createdByStudent: true, approvalStatus: 'denied' })])).toBe(3));
test('dates, staff and coaching remain separate', () => {
    const events = [event(9, 12), event(9, 12, false, { start: date(9, '2026-10-19'), end: date(12, '2026-10-19') }), event(9, 11, false, { workType: 'coaching' }), event(9, 11, false, { staff: ['other@school.test'] })];
    expect(paid(events)).toBe(10); expect(calculateHours(events).days).toHaveLength(4);
});
test('short and complex warnings do not prevent a result', () => { expect(calculateHours([event(9, 9.5, true)]).days[0].warnings[0].code).toBe('short-shift'); expect(calculateHours([event(9, 11, true), event(14, 16, true)]).days[0].warnings.map(w => w.code)).toEqual(['complex-day']); });
test('Work supplies coverage; only approved bookings and coaching consume it', () => {
    const availability = [{ tutor: 'tutor@school.test', start: date(9), end: date(10) }];
    const free = bookableIntervals('tutor@school.test', availability, [event(10, 14), event(11, 12, true), event(13, 14, true, { createdByStudent: true, approvalStatus: 'pending' })]);
    expect(rangeCovered(date(9), date(11), free)).toBe(true); expect(rangeCovered(date(10), date(13), free)).toBe(false); expect(rangeCovered(date(12), date(14), free)).toBe(true);
});
test('Work overlaps permitted, student clashes and coaching blocked', () => { expect(commitmentsConflict(event(9, 12), event(10, 11, true))).toBe(false); expect(commitmentsConflict(event(9, 12, true), event(10, 11, true))).toBe(true); expect(commitmentsConflict(event(9, 12, false, { workType: 'coaching' }), event(10, 11))).toBe(true); });
test('approval includes exact 15 minute boundary', () => { const request = event(9, 10, true, { approvalStatus: 'pending' }); expect(canApproveAt(request, +request.start + 900000)).toBe(true); expect(canApproveAt(request, +request.start + 900001)).toBe(false); });
test('recurrence preserves Sydney wall time across DST', () => { const start = new Date('2026-09-28T09:00:00+10:00'); const end = new Date('2026-09-28T10:00:00+10:00'); const events = expandRecurringEvents([{ ...event(9, 10), start, end, recurring: 'weekly', occurenceNum: 3 }], { rangeStart: start, rangeEnd: new Date('2026-10-20') }); expect(events[1].start.toISOString()).toBe('2026-10-04T22:00:00.000Z'); });

test('free intervals preserve remote and onsite locations while allowing continuous coverage', () => {
    const free = bookableIntervals('tutor@school.test', [
        { tutor: 'tutor@school.test', start: date(9), end: date(10), locationType: 'remote' },
        { tutor: 'tutor@school.test', start: date(10), end: date(11), locationType: 'onsite' },
    ], []);
    expect(free.map(slot => slot.locationType)).toEqual(['remote', 'onsite']);
    expect(rangeCovered(date(9), date(11), free)).toBe(true);
});
