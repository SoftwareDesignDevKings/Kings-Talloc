/** @jest-environment node */
jest.mock('server-only', () => ({}), { virtual: true });
const { findUserProfile, legacyProfileAliases } = require('@/lib/security/userProfiles');
const { resolveClassParticipants } = require('@/lib/scheduling/readSchedule');

let records, reads;
const fakeDb = () => ({
    collection: name => {
        const query = {
            select: () => query,
            where: (field, op, value) => ({ ...query, get: async () => {
                const docs = Object.entries(records[name] || {}).filter(([, data]) => data[field] === value).map(([id, data]) => ({ id, data: () => data }));
                reads.push({ name, query: `${field}${op}${value}`, count: docs.length });
                return { docs };
            } }),
            get: async () => {
                const docs = Object.entries(records[name] || {}).map(([id, data]) => ({ id, data: () => data }));
                reads.push({ name, query: 'all', count: docs.length });
                return { docs };
            },
            doc: id => ({ id, get: async () => {
                reads.push({ name, id });
                return { id, exists: Boolean(records[name]?.[id]), data: () => records[name]?.[id] };
            } }),
        };
        return query;
    },
});
beforeEach(() => { records = { users: {} }; reads = []; });

test('an existing lowercase profile is found directly without reading aliases', async () => {
    records.users['tutor@school.test'] = { name: 'Tutor' };
    const aliases = jest.fn();
    const profile = await findUserProfile(fakeDb(), 'Tutor@School.test', undefined, { aliases });
    expect(profile.id).toBe('tutor@school.test');
    expect(aliases).not.toHaveBeenCalled();
});

test('a legacy mixed-case profile is found through the cached aliases with one extra read', async () => {
    records.users['Legacy.Tutor@School.test'] = { name: 'Legacy' };
    const profile = await findUserProfile(fakeDb(), 'legacy.tutor@school.test', undefined, { aliases: async () => ({ 'legacy.tutor@school.test': ['Legacy.Tutor@School.test'] }) });
    expect(profile.id).toBe('Legacy.Tutor@School.test');
    expect(reads.filter(read => read.name === 'users')).toEqual([{ name: 'users', id: 'legacy.tutor@school.test' }, { name: 'users', id: 'Legacy.Tutor@School.test' }]);
});

test('a brand-new user costs only the direct lookup, never a users scan', async () => {
    const profile = await findUserProfile(fakeDb(), 'new.student@school.test', undefined, { aliases: async () => ({}) });
    expect(profile).toBeNull();
    expect(reads).toEqual([{ name: 'users', id: 'new.student@school.test' }]);
});

test('ambiguous legacy spellings fail closed, and stale aliases for deleted profiles are ignored', async () => {
    records.users['StuDent@School.Test'] = {}; records.users['Student@School.Test'] = {};
    await expect(findUserProfile(fakeDb(), 'student@school.test', undefined, { aliases: async () => ({ 'student@school.test': ['StuDent@School.Test', 'Student@School.Test'] }) }))
        .rejects.toThrow('Multiple profiles');
    await expect(findUserProfile(fakeDb(), 'gone@school.test', undefined, { aliases: async () => ({ 'gone@school.test': ['Gone@School.test'] }) })).resolves.toBeNull();
});

test('profile reads go through the supplied reader so transactions lock them', async () => {
    records.users['Legacy@School.test'] = {};
    const read = jest.fn(ref => ref.get());
    await findUserProfile(fakeDb(), 'legacy@school.test', read, { aliases: async () => ({ 'legacy@school.test': ['Legacy@School.test'] }) });
    expect(read.mock.calls.map(([ref]) => ref.id)).toEqual(['legacy@school.test', 'Legacy@School.test']);
});

test('the alias map only lists legacy (non-lowercase) profile IDs', async () => {
    records.users = { 'a@school.test': {}, 'Mixed.Case@School.test': {}, 'MIXED.case@school.test': {} };
    expect(await legacyProfileAliases(fakeDb())).toEqual({ 'mixed.case@school.test': ['Mixed.Case@School.test', 'MIXED.case@school.test'] });
});

test('class rosters are read once per class when several events share it', async () => {
    records.canvasEnrollments = { e1: { courseId: '101', email: 'one@school.test', userName: 'One' } };
    records.classes = {};
    const rosterCache = new Map();
    const event = { classes: [{ value: '101' }] };
    const [first, second] = await Promise.all([
        resolveClassParticipants(fakeDb(), event, null, rosterCache),
        resolveClassParticipants(fakeDb(), { ...event }, null, rosterCache),
    ]);
    expect(first.students).toEqual([{ value: 'one@school.test', label: 'One' }]);
    expect(second.students).toEqual(first.students);
    expect(reads.filter(read => read.name === 'canvasEnrollments')).toHaveLength(1);
});
