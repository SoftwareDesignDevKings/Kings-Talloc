import { test, expect } from '@playwright/test';
import { toFirestoreValue } from './wrapperFunctions';

test.use({ timezoneId: 'Australia/Sydney' });
test.setTimeout(90000);
const viewers = ['computing@kings.edu.au', 'tutorAdmin@kings.edu.au', 'teacher@kings.edu.au', 'tutor@kings.edu.au', 'coach@kings.edu.au', 'coachTutor@kings.edu.au', 'student@kings.edu.au'];
const roles = { 'admin-tests': 'admin', 'tutorAdmin-tests': 'admin', 'teacher-tests': 'teacher', 'tutor-tests': 'tutor', 'coach-tests': 'coach', 'coachTutor-tests': 'coach', 'student-tests': 'student' };
const root = () => {
    const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const host = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
    if (!project?.startsWith('demo-') || !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) throw new Error('Colour checks require local demo emulators.');
    return `http://${host}/v1/projects/${project}/databases/(default)/documents`;
};
const at = hour => new Date(`2026-10-15T${String(hour).padStart(2, '0')}:00:00+11:00`);
const cases = [
    ['confirmed', {}, 'rgb(204, 224, 255)'],
    ['coaching', { workType: 'coaching' }, 'rgb(226, 180, 238)'],
    ['completed', { workStatus: 'completed' }, 'rgb(125, 174, 255)'],
    ['coachingCompleted', { workType: 'coaching', workStatus: 'completed' }, 'rgb(191, 125, 207)'],
    ['notAttended', { workStatus: 'notAttended' }, 'rgb(236, 205, 191)'],
    ['confirmation', { minStudents: 2 }, 'rgb(204, 224, 255)'],
];
const block = (page, key) => page.locator('.rbc-calendar .rbc-event').filter({ has: page.getByText(`Colour check ${key}`, { exact: true }) });
let originalHelp;
let restoreHelp = false;
const patchHelp = async value => {
    const response = await fetch(`${root()}/users/${viewers[6]}?updateMask.fieldPaths=hasSeenCalendarHelp`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: value ? { hasSeenCalendarHelp: value } : {} }) });
    expect(response.ok).toBe(true);
};
test.beforeEach(async ({}, info) => {
    restoreHelp = false;
    const base = root(); const prefix = new URL(base).pathname.replace('/v1/', '');
    const writes = cases.map(([key, overrides], index) => {
        const data = { title: `Colour check ${key}`, start: at(9 + index), end: new Date(+at(9 + index) + 1800000),
            emailsList: viewers, staff: [{ value: viewers[3], label: 'Demo Tutor' }], students: [{ value: viewers[6], label: 'Demo Student' }],
            workType: 'tutoring', workStatus: 'notCompleted', minStudents: 0, recurring: null, ...overrides };
        return { update: { name: `${prefix}/shifts/ui-colour-guide-${key}`, fields: Object.fromEntries(Object.entries(data).map(([field, value]) => [field, toFirestoreValue(value)])) } };
    });
    const response = await fetch(`${base}:commit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ writes }) }); expect(response.ok).toBe(true);
    if (info.project.name === 'student-tests') {
        const response = await fetch(`${base}/users/${viewers[6]}`); expect(response.ok).toBe(true);
        originalHelp = (await response.json()).fields.hasSeenCalendarHelp;
        restoreHelp = true;
        await patchHelp({ booleanValue: true });
    }
});
test.afterEach(async () => {
    const base = root(); const prefix = new URL(base).pathname.replace('/v1/', '');
    try {
        const response = await fetch(`${base}:commit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ writes: cases.map(([key]) => ({ delete: `${prefix}/shifts/ui-colour-guide-${key}` })) }) }); expect(response.ok).toBe(true);
    } finally { if (restoreHelp) await patchHelp(originalHelp); }
});

test('sidebar guide matches rendered events and the active role @teacherAdmin @tutorAdmin @teacherOnly @tutorOnly @coachOnly @coachTutor @studentOnly', async ({ page }, info) => {
    const role = roles[info.project.name];
    await page.clock.setFixedTime(new Date('2026-10-15T00:00:00Z')); await page.goto('/calendar');
    const guide = page.locator(`[data-calendar-colour-guide="${role}"]`); await expect(guide).toBeVisible();
    await expect(guide.locator('[data-calendar-colour="availabilityHeatmap"]')).toHaveCount(1);
    await expect(guide.locator('[data-calendar-colour="availabilityBlock"]')).toHaveCount(['tutor', 'coach'].includes(role) ? 1 : 0);
    await expect(guide.locator('[data-calendar-colour="pending"]')).toHaveCount(['admin', 'teacher', 'student'].includes(role) ? 1 : 0);
    await expect(guide.locator('[data-calendar-colour="declined"]')).toHaveCount(0);
    for (const [key, , colour] of cases) {
        const event = block(page, key); await expect(event).toBeVisible();
        // Main ignores legacy minimum-confirmation metadata for every role.
        const expected = colour;
        await expect(event).toHaveCSS('background-color', expected);
        const guideKey = key === 'confirmation' ? 'confirmed' : key;
        const swatch = guide.locator(`[data-calendar-colour="${guideKey}"] [data-calendar-colour-swatch]`);
        await expect(swatch).toHaveCSS('background-color', expected);
        expect(await swatch.evaluate(el => getComputedStyle(el).borderLeftColor)).toBe(await event.evaluate(el => getComputedStyle(el).borderLeftColor));
        await expect(event).toHaveCSS('border-left-width', '4px');
    }
});
