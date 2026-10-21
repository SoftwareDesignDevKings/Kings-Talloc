/** @jest-environment node */
jest.mock('server-only', () => ({}), { virtual: true });
// Stand-in for Firestore OR filters, evaluated by the fake query below.
jest.mock('firebase-admin/firestore', () => ({ Filter: { or: (...filters) => ({ or: filters }), where: (field, op, value) => ({ field, op, value }) } }));
const { readAvailability } = require('@/lib/scheduling/readAvailability');
const { readSchedule } = require('@/lib/scheduling/readSchedule');
const { bookableIntervals } = require('@/lib/scheduling/eventRules');
const { DateTime } = require('luxon');
const tutor = 'tutor@school.test';
const start = new Date('2027-04-06T05:00Z'), end = new Date('2027-04-06T08:00Z');
const shift = (extra = {}) => ({ start, end, staff: [tutor], workType: 'work', students: [], ...extra });
let records, reads, db;
beforeEach(() => {
    records = { users: [{ id: tutor, email: tutor, defaultRole: 'tutor' }], shifts: [], tutorAvailabilities: [] }; reads = [];
    const query = (name, filters = [], ceiling = Infinity) => ({
        where: (field, op, value) => query(name, [...filters, field?.or ? ['or', 'or', field.or] : [field, op, value]], ceiling),
        orderBy: () => query(name, filters, ceiling), select: () => query(name, filters, ceiling),
        limit: value => query(name, filters, value),
        get: async () => {
            const matches = (record, [field, op, value]) => {
                if (op === 'or') return value.some(filter => matches(record, [filter.field, filter.op, filter.value]));
                const actual = record[field];
                if (op === '==') return actual === value;
                if (op === 'in') return value.includes(actual);
                if (op === 'array-contains') return (actual || []).includes(value);
                if (op === '<') return actual < value;
                if (op === '>') return actual > value;
                if (op === '>=') return actual >= value;
                throw new Error(op);
            };
            const found = records[name].filter(record => filters.every(filter => matches(record, filter))).slice(0, ceiling);
            reads.push({ name, filters, ceiling, ids: found.map(record => record.id) });
            return { docs: found.map(record => ({ id: record.id, data: () => record })) };
        },
    });
    db = { collection: name => { if (!records[name]) throw new Error(`Unexpected roster scan: ${name}`); return query(name); } };
});
test('only date-overlapping Work, bookings and availability are read; future schedules and student profiles are excluded', async () => {
    records.users.push({ id: 'student', defaultRole: 'student' });
    records.shifts = [{ id: 'work', ...shift() }, { id: 'booking', ...shift({ start: new Date(+start + 3600000), end: new Date(+start + 5400000), students: ['student'] }) },
        ...Array.from({ length: 6000 }, (_, id) => ({ id: `future-${id}`, ...shift({ start: new Date('2030-01-01'), end: new Date('2030-01-02') }) }))];
    records.tutorAvailabilities = [{ id: 'availability', tutor, start, end }, { id: 'far-future', tutor, start: new Date('2030-01-01'), end: new Date('2030-01-02') }];
    const result = await readAvailability(db, start, end, new Set([tutor]));
    expect(result.shifts).toHaveLength(2); expect(result.availability).toHaveLength(1);
    expect(bookableIntervals(tutor, result.availability, result.shifts).map(s => [s.start, s.end])).toEqual([
        [start, new Date(+start + 3600000)], [new Date(+start + 5400000), end],
    ]);
    expect(reads.flatMap(read => read.ids)).not.toContain('student');
    expect(reads.flatMap(read => read.ids).some(id => String(id).startsWith('future-'))).toBe(false);
    expect(reads.every(read => read.ceiling === 5001)).toBe(true);
});
test('role-only legacy tutors and secondary tutor roles work; disabled or ineligible tutors do not', async () => {
    records.users.push({ id: 'legacy', email: 'legacy@school.test', role: 'tutor' },
        { id: 'secondary', email: 'secondary@school.test', defaultRole: 'coach', userRoles: ['tutor'] },
        { id: 'disabled', email: 'disabled@school.test', defaultRole: 'tutor', disabled: true });
    expect((await readAvailability(db, start, end)).tutors.sort()).toEqual([tutor, 'legacy@school.test', 'secondary@school.test'].sort());
    expect((await readAvailability(db, start, end, new Set([tutor]))).tutors).toEqual([tutor]);
});
test('ongoing weekly Work from years ago remains bookable across daylight-saving changes and exceptions', async () => {
    const base = DateTime.fromISO('2020-01-07T15:00', { zone: 'Australia/Sydney' });
    const occurrence = DateTime.fromJSDate(start, { zone: 'Australia/Sydney' });
    const index = Math.round(occurrence.diff(base, 'weeks').weeks);
    records.shifts = [{ id: 'old-recurring', ...shift({ start: base.toJSDate(), end: base.plus({ hours: 3 }).toJSDate(), recurring: 'weekly' }) }];
    let result = await readAvailability(db, start, end);
    expect(result.shifts).toHaveLength(1); expect(result.shifts[0].start).toEqual(start);
    records.shifts[0].eventExceptions = [index];
    result = await readAvailability(db, start, end); expect(result.shifts).toEqual([]);
});
test('long legacy bookings and unresolved class-only bookings stay occupied without roster reads', async () => {
    records.shifts = [{ id: 'long', ...shift({ start: new Date(+start - 2 * 86400000), students: ['student'] }) },
        { id: 'class-only', ...shift({ classes: ['legacy-class'] }) }];
    const result = await readAvailability(db, start, end);
    expect(result.shifts).toHaveLength(2);
    expect(bookableIntervals(tutor, [{ tutor, start, end }], result.shifts)).toEqual([]);
});
test('oversized database results fail instead of silently truncating', async () => {
    records.shifts = Array.from({ length: 5001 }, (_, id) => ({ id, ...shift() }));
    await expect(readAvailability(db, start, end)).rejects.toThrow('smaller date range');
});
test('a pathological number of overlapping availability records cannot cause unbounded computation', async () => {
    records.tutorAvailabilities = Array.from({ length: 1001 }, (_, id) => ({ id, tutor, start, end }));
    await expect(readAvailability(db, start, end)).rejects.toThrow('smaller date range');
});


test('ordinary approval/report schedule reads also exclude unrelated future dates', async () => {
    records.shifts = [{ id: 'current', ...shift() }, { id: 'future', ...shift({ start: new Date('2030-01-01'), end: new Date('2030-01-02') }) }];
    expect((await readSchedule(db, start, end)).map(event => event.id)).toEqual(['current']);
    expect(reads.flatMap(read => read.ids)).not.toContain('future');
});
test('recurring edits retain their deliberate validation against commitments years ahead', async () => {
    records.shifts = [{ id: 'current', ...shift() }, { id: 'future', ...shift({ start: new Date('2030-01-01'), end: new Date('2030-01-02') }) }];
    expect((await readSchedule(db, start, end, undefined, { includeFuture: true })).map(event => event.id)).toEqual(['current', 'future']);
});
test('a supplied cache serves repeat reads without touching Firestore', async () => {
    records.shifts = [{ id: 'work', ...shift() }];
    records.tutorAvailabilities = [{ id: 'availability', tutor, start, end }];
    const store = new Map();
    const cache = jest.fn(async (key, ttl, load) => { if (!store.has(key)) store.set(key, await load()); return store.get(key); });
    const first = await readAvailability(db, start, end, new Set([tutor]), [], { cache });
    const firestoreReads = reads.length;
    const second = await readAvailability(db, start, end, null, [], { cache });
    expect(reads).toHaveLength(firestoreReads);
    expect(second).toEqual(first);
    const weekStart = DateTime.fromJSDate(start, { zone: 'Australia/Sydney' }).startOf('week').toJSDate();
    expect([...new Set(cache.mock.calls.map(([key]) => key))]).toEqual(['availability:tutors', 'availability:recurring', `availability:week:${+weekStart}`]);
});
test('different ranges in the same week share cached reads; a longer range adds only its new weeks', async () => {
    records.shifts = [{ id: 'work', ...shift() }];
    records.tutorAvailabilities = [{ id: 'availability', tutor, start, end }];
    const store = new Map();
    const cache = jest.fn(async (key, ttl, load) => { if (!store.has(key)) store.set(key, await load()); return store.get(key); });
    // A calendar week view, then a booking form for one hour of that week.
    const week = DateTime.fromJSDate(start, { zone: 'Australia/Sydney' }).startOf('week');
    await readAvailability(db, week.toJSDate(), week.plus({ weeks: 1 }).toJSDate(), null, [], { cache });
    const afterWeek = reads.length;
    const booking = await readAvailability(db, new Date(+start + 3600000), new Date(+start + 7200000), null, [], { cache });
    expect(reads).toHaveLength(afterWeek);
    expect(booking.availability.map(event => event.id)).toEqual(['availability']);
    // Two weeks reads just the second week's shifts and availability.
    await readAvailability(db, week.toJSDate(), week.plus({ weeks: 2 }).toJSDate(), null, [], { cache });
    expect(reads.slice(afterWeek).map(read => read.name).sort()).toEqual(['shifts', 'tutorAvailabilities']);
    expect([...store.keys()].filter(key => key.startsWith('availability:week:'))).toHaveLength(2);
});
test('tutors are read with one query and recurring series are read once for any range', async () => {
    records.users.push({ id: 'legacy', email: 'legacy@school.test', role: 'tutor' }, { id: 'secondary', email: 'secondary@school.test', defaultRole: 'coach', userRoles: ['tutor'] });
    await readAvailability(db, start, end);
    expect(reads.filter(read => read.name === 'users')).toHaveLength(1);
    expect(reads.filter(read => read.name === 'shifts' && read.filters.some(([field]) => field === 'recurring'))).toHaveLength(1);
});
