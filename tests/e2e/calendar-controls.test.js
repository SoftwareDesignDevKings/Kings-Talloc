import { test, expect } from '@playwright/test';
import { DateTime } from 'luxon';
import { seedShiftInEmulator, seedStudentRequestInEmulator, seedUserInEmulator } from './wrapperFunctions';

test.use({ timezoneId: 'Australia/Sydney' });
// Allow fresh browser contexts and local compilation to settle on a busy dev host.
test.setTimeout(90000);
const tags = '@teacherAdmin @tutorAdmin @teacherOnly @tutorOnly @coachOnly @coachTutor @studentOnly';
const emails = ['computing@kings.edu.au', 'tutorAdmin@kings.edu.au', 'teacher@kings.edu.au', 'tutor@kings.edu.au', 'coach@kings.edu.au', 'coachTutor@kings.edu.au', 'student@kings.edu.au'];
const base = () => {
    const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const host = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
    if (!project?.startsWith('demo-') || !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) throw new Error('Calendar controls checks require local demo emulators.');
    return `http://${host}/v1/projects/${project}/databases/(default)/documents`;
};
const patchHelp = async fields => {
    const response = await fetch(`${base()}/users/student@kings.edu.au?updateMask.fieldPaths=hasSeenCalendarHelp`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
    if (!response.ok) throw new Error('Cannot prepare/restore local calendar help preference.');
};
let originalHelp;
let helpPrepared = false;
const makeShift = (title, workType) => {
    // Fixture timestamps must use the browser's zone, independent of the runner's TZ.
    const start = DateTime.now().setZone('Australia/Sydney').set({ hour: 12, minute: 0, second: 0, millisecond: 0 }).toJSDate();
    return { title, workType, start, end: new Date(+start + 3600000), recurring: null, workStatus: 'notCompleted',
        staff: [{ value: 'tutor@kings.edu.au', label: 'Calendar Fixture Tutor' }], students: [{ value: 'student@kings.edu.au', label: 'Calendar Fixture Student' }],
        emailsList: emails, staffEmails: ['tutor@kings.edu.au'], studentEmails: ['student@kings.edu.au'] };
};
const ready = async page => {
    await page.goto('/calendar');
    await expect(page.locator('.rbc-calendar')).toBeVisible();
    await expect(page.locator('.rbc-toolbar')).toBeVisible();
};
const toolbar = page => page.locator('.rbc-toolbar');
const event = (page, title) => page.locator('.rbc-calendar .rbc-event').filter({ has: page.getByText(title, { exact: true }) });

    test.beforeEach(async ({}, info) => {
        base();
        helpPrepared = false;
        await seedShiftInEmulator('ui-calendar-controls-tutoring', makeShift('Calendar controls tutoring', 'tutoring'));
        await seedShiftInEmulator('ui-calendar-controls-coaching', makeShift('Calendar controls coaching', 'coaching'));
        await seedStudentRequestInEmulator('ui-calendar-controls-denied', { ...makeShift('Calendar controls denied', 'tutoring'), approvalStatus: 'denied', createdByStudent: true, isStudentRequest: true });
        if (info.project.name === 'student-tests') {
            const response = await fetch(`${base()}/users/student@kings.edu.au`);
            if (!response.ok) throw new Error('Cannot snapshot local student help preference.');
            originalHelp = (await response.json()).fields.hasSeenCalendarHelp;
            await patchHelp({ hasSeenCalendarHelp: { booleanValue: true } });
            helpPrepared = true;
        }
    });
    test.afterEach(async ({}, info) => {
        for (const path of ['shifts/ui-calendar-controls-tutoring', 'shifts/ui-calendar-controls-coaching', 'studentEventRequests/ui-calendar-controls-denied', 'users/ui-calendar-controls-choice@example.edu']) {
            const response = await fetch(`${base()}/${path}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(`Cannot remove owned calendar fixture ${path}`);
        }
        if (info.project.name === 'student-tests' && helpPrepared) {
            await patchHelp(originalHelp ? { hasSeenCalendarHelp: originalHelp } : {});
            helpPrepared = false;
        }
    });
test.describe(`Calendar controls ${tags}`, () => {
    test('date navigation and view selection retain their range and mobile restrictions', async ({ page }) => {
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        await ready(page);
        await toolbar(page).getByRole('button', { name: 'Today', exact: true }).click();
        const today = await toolbar(page).locator('.rbc-toolbar-label').innerText();
        await toolbar(page).getByRole('button', { name: 'Next', exact: true }).click();
        await expect(toolbar(page).locator('.rbc-toolbar-label')).not.toHaveText(today);
        await toolbar(page).getByRole('button', { name: 'Back', exact: true }).click();
        await expect(toolbar(page).locator('.rbc-toolbar-label')).toHaveText(today);
        for (const [view, selector] of [['Month', '.rbc-month-view'], ['Day', '.rbc-time-view'], ['Week', '.rbc-time-view']]) {
            await toolbar(page).getByRole('button', { name: view, exact: true }).click();
            await expect(page.locator(selector)).toBeVisible();
            await expect(toolbar(page).getByRole('button', { name: view, exact: true })).toHaveClass(/rbc-active/);
        }
        for (const width of [390, 320]) {
            await page.setViewportSize({ width, height: 740 });
            await expect(toolbar(page).getByRole('button', { name: 'Month', exact: true })).toHaveCount(0);
            await expect(toolbar(page).getByRole('button', { name: 'Day', exact: true })).toHaveClass(/rbc-active/);
            for (const label of ['Today', 'Back', 'Next', 'Day', 'Week']) await expect(toolbar(page).getByRole('button', { name: label, exact: true })).toBeInViewport({ ratio: 1 });
        }
        expect(errors).toEqual([]);
    });
    test('role controls actually hide and restore events, and collapsing keeps filter state', async ({ page }, info) => {
        // Students know their work sessions as tutoring.
        const workLabel = info.project.name === 'student-tests' ? 'Show tutoring sessions' : 'Show work shifts';
        await ready(page);
        await toolbar(page).getByRole('button', { name: 'Today', exact: true }).click();
        await expect(event(page, 'Calendar controls tutoring')).toBeVisible();
        await page.getByLabel(workLabel, { exact: true }).locator('xpath=ancestor::label[1]').click();
        await expect(event(page, 'Calendar controls tutoring')).toHaveCount(0);
        await expect(event(page, 'Calendar controls coaching')).toBeVisible();
        const collapse = page.locator('button[aria-controls="filterPanelCollapse"]');
        await collapse.click();
        await expect(collapse).toHaveAttribute('aria-expanded', 'false');
        await expect(page.getByRole('heading', { name: 'Filters', exact: true })).not.toBeVisible();
        await collapse.click();
        await expect(page.getByLabel(workLabel, { exact: true })).not.toBeChecked();
        await page.getByLabel(workLabel, { exact: true }).locator('xpath=ancestor::label[1]').click();
        await expect(event(page, 'Calendar controls tutoring')).toBeVisible();
        if (['admin-tests', 'tutorAdmin-tests', 'teacher-tests'].includes(info.project.name)) {
            await expect(event(page, 'Calendar controls denied')).toBeVisible();
            await page.getByLabel('Hide denied student requests', { exact: true }).locator('xpath=ancestor::label[1]').click();
            await expect(event(page, 'Calendar controls denied')).toHaveCount(0);
            await page.getByLabel('Hide denied student requests', { exact: true }).locator('xpath=ancestor::label[1]').click();
            await expect(event(page, 'Calendar controls denied')).toBeVisible();
        }
        if (['tutor-tests', 'coach-tests', 'coachTutor-tests'].includes(info.project.name)) {
            await page.getByLabel('Show tutor availability', { exact: true }).locator('xpath=ancestor::label[1]').click();
            await expect(page.getByLabel('Hide my own availabilities', { exact: true })).toBeDisabled();
            await page.getByLabel('Show tutor availability', { exact: true }).locator('xpath=ancestor::label[1]').click();
            await expect(page.getByLabel('Hide my own availabilities', { exact: true })).toBeEnabled();
        }
    });

});

test('student Help opens each existing accordion and closes with Got it @studentOnly', async ({ page }) => {
    test.setTimeout(60000);
    await ready(page);
    await page.getByTitle('How to use the calendar').click();
    await expect(page.getByRole('heading', { name: 'How to use the calendar', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Using the filters', exact: true }).click();
    await expect(page.getByText('Choose tutors', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Working with sessions', exact: true }).click();
    await expect(page.getByText('Click an event', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Got it', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'How to use the calendar', exact: true })).not.toBeVisible();
    const help = page.getByRole('button', { name: 'Help', exact: true });
    await expect(help).toBeFocused();
    await help.click();
    await expect(page.getByRole('dialog', { name: 'How to use the calendar' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'How to use the calendar' })).toHaveCount(0);
    await expect(help).toBeFocused();
    await help.click();
    await page.locator('[data-untitled-modal-overlay]').click({ position: { x: 5, y: 5 } });
    await expect(page.getByRole('dialog', { name: 'How to use the calendar' })).toHaveCount(0);
    await help.click();
    await page.setViewportSize({ width: 320, height: 568 });
    const dialog = page.getByRole('dialog', { name: 'How to use the calendar' });
    await expect(dialog).toBeInViewport({ ratio: 1 });
    await expect(dialog.getByRole('button', { name: 'Got it', exact: true })).toBeInViewport({ ratio: 1 });
    await expect.poll(() => dialog.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: '/tmp/calendar-help-mobile.png' });
    await dialog.getByRole('button', { name: 'Got it', exact: true }).click();
    await expect(dialog).toHaveCount(0);
});


test('searchable tutor dropdown keeps keyboard selection, removal and event filtering @teacherAdmin @tutorAdmin', async ({ page }) => {
    await seedUserInEmulator('ui-calendar-controls-choice@example.edu', { email: 'ui-calendar-controls-choice@example.edu', name: 'Calendar Choice Tutor', defaultRole: 'tutor', userRoles: [] });
    await ready(page);
    const trigger = page.getByRole('button', { name: 'Select tutors', exact: true });
    await expect(trigger.locator('..')).toHaveCSS('position', 'relative');
    await expect(trigger.locator('..')).toHaveCSS('border-radius', '8px');
    await trigger.click();
    const input = page.getByRole('searchbox', { name: 'Search Select tutors', exact: true });
    await input.fill('Calendar Choice');
    await expect(page.getByRole('option', { name: 'Calendar Choice Tutor', exact: true })).toBeVisible();
    await input.press('ArrowDown');
    await input.press('Enter');
    await expect(event(page, 'Calendar controls tutoring')).toHaveCount(0);
    await expect(page.getByText('Calendar Choice Tutor', { exact: true })).toBeVisible();
    await trigger.press('Backspace');
    await expect(event(page, 'Calendar controls tutoring')).toBeVisible();
    await trigger.click();
    await input.fill('Calendar Choice');
    await expect(page.getByRole('option', { name: 'Calendar Choice Tutor', exact: true })).toBeVisible();
    await input.press('Escape');
    await expect(page.getByRole('option', { name: 'Calendar Choice Tutor', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Filter availabilities', exact: true })).toHaveCount(0);
    for (const width of [1280, 846, 768]) {
        await page.setViewportSize({ width, height: 740 });
        await trigger.click();
        const menu = page.getByRole('dialog', { name: 'Select tutors', exact: true });
        await expect(menu).toBeVisible();
        await expect.poll(async () => {
            const box = await menu.boundingBox();
            return Math.max(-box.x, box.x + box.width - width, -box.y, box.y + box.height - 740);
        }).toBeLessThanOrEqual(1);
        await page.keyboard.press('Escape'); await expect(menu).toHaveCount(0);
    }
    // The existing mobile Calendar hides Filters; dialog dropdowns are tested separately at 320px.
    for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 740 });
        await expect(trigger).not.toBeVisible();
    }
});
