import { test, expect } from '@playwright/test';
import { DateTime } from 'luxon';
import { seedShiftInEmulator, seedTutorAvailabilityInEmulator, seedStudentRequestInEmulator, seedUserInEmulator, seedStudentEligibilityInEmulator } from './wrapperFunctions';

test.use({ timezoneId: 'Australia/Sydney' });
test.setTimeout(90000);
const prefix = 'Calendar surface UI ';
const mainTitle = prefix + 'session with a long title to check clipping';
const tutorEmail = 'ui-calendar-surface-tutor@example.edu';
const viewers = ['computing@kings.edu.au', 'tutorAdmin@kings.edu.au', 'teacher@kings.edu.au', 'tutor@kings.edu.au', 'coach@kings.edu.au', 'coachTutor@kings.edu.au', 'student@kings.edu.au'];
const ownEmails = { 'tutor-tests': viewers[3], 'coach-tests': viewers[4], 'coachTutor-tests': viewers[5] };
const root = () => {
    const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const host = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
    if (!project?.startsWith('demo-') || !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) throw new Error('Calendar surface checks require local demo emulators.');
    return `http://${host}/v1/projects/${project}/databases/(default)/documents`;
};
const read = async path => {
    const response = await fetch(`${root()}/${path}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Cannot read calendar surface fixture ${path}`);
    return response.json();
};
const list = async collection => {
    const data = await read(`${collection}?pageSize=1000`);
    if (data?.nextPageToken) throw new Error('Incomplete fixture enumeration');
    return data?.documents || [];
};
const remove = async path => {
    const response = await fetch(`${root()}/${path}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 404) throw new Error(`Cannot remove owned fixture ${path}`);
};
const help = async fields => {
    const response = await fetch(`${root()}/users/student@kings.edu.au?updateMask.fieldPaths=hasSeenCalendarHelp`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
    if (!response.ok) throw new Error('Cannot prepare/restore demo calendar help');
};
const iso = value => new Date(value).toISOString();
const at = hour => new Date(`2026-10-15T${String(hour).padStart(2, '0')}:00:00+11:00`);
const block = (page, title = mainTitle) => page.locator('.rbc-calendar .rbc-event').filter({ has: page.getByText(title, { exact: true }) });
const slot = (page, day, hour) => page.locator('.rbc-day-slot').nth(day).locator('.rbc-time-slot').nth((hour - 4) * 2);
const ready = async page => {
    await page.clock.setFixedTime(new Date('2026-10-15T00:00:00Z')); await page.goto('/calendar');
    await expect(page.locator('.rbc-calendar')).toBeVisible(); await expect(block(page)).toBeVisible();
};
const close = async page => {
    const dialog = page.getByRole('dialog').first();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0);
};
const scrollToSlot = async (page, day, hour) => {
    const target = slot(page, day, hour);
    // A scheduling snapshot can replace slots while scrolling; resolve the fresh slot again.
    // Scroll without hovering because another event may cover this drag destination.
    await expect(async () => { await target.scrollIntoViewIfNeeded(); }).toPass({ timeout: 15000 });
    return target;
};
const dragTo = async (page, event, day, hour, resize = false) => {
    const target = await scrollToSlot(page, day, hour);
    await event.hover();
    const source = resize ? event.locator('.rbc-addons-dnd-resize-ns-anchor').last() : event;
    const from = await source.boundingBox(); const to = await target.boundingBox();
    const x = from.x + Math.min(from.width / 3, 24); const y = from.y + (resize ? from.height / 2 : 12);
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(to.x + to.width / 3, to.y + (resize ? 1 : 12), { steps: 20 }); await page.mouse.up();
};
let snapshots;
let helpBefore;
let eligibilityBefore;
let prepared = false;
test.beforeEach(async ({}, info) => {
    prepared = false; snapshots = {};
    for (const collection of ['shifts', 'tutorAvailabilities', 'studentEventRequests']) {
        const docs = await list(collection);
        if (docs.some(doc => doc.fields?.title?.stringValue?.startsWith(prefix))) throw new Error('Existing surface fixture must be reviewed before testing');
        snapshots[collection] = new Set(docs.map(doc => doc.name));
    }
    if (await read(`users/${tutorEmail}`)) throw new Error('Existing surface reference fixture');
    helpBefore = info.project.name === 'student-tests' ? (await read(`users/${viewers[6]}`)).fields.hasSeenCalendarHelp : undefined;
    prepared = true;
    if (info.project.name === 'student-tests') {
        await help({ hasSeenCalendarHelp: { booleanValue: true } });
        eligibilityBefore = await read(`studentTutorEligibility/${viewers[6]}`);
        await seedStudentEligibilityInEmulator(viewers[6], [tutorEmail]);
    }
    await seedUserInEmulator(tutorEmail, { email: tutorEmail, name: 'Grid Tutor', defaultRole: 'tutor', role: 'tutor', userRoles: ['tutor'] });
    const shift = { title: mainTitle, start: at(11), end: at(12), staff: [{ value: tutorEmail, label: 'Grid Tutor', roles: ['tutor'] }], students: [], emailsList: viewers, recurring: null, workType: 'work', workStatus: 'notCompleted', approvalStatus: 'approved', createdByStudent: false, createTeamsMeeting: false };
    await seedShiftInEmulator('ui-calendar-surface-main', shift);
    await seedTutorAvailabilityInEmulator('ui-calendar-surface-overlay', { title: prefix + 'overlay availability', tutor: tutorEmail, start: at(8), end: at(10), workType: ['tutoring'], locationType: 'onsite' });
    await seedShiftInEmulator('ui-calendar-surface-overlap', { ...shift, title: prefix + 'overlapping coaching', staff: [{ value: 'ui-grid-other@example.edu', label: 'Other Coach' }], end: new Date(+at(12) + 1800000), workType: 'coaching' });
    await seedStudentRequestInEmulator('ui-calendar-surface-request', { ...shift, title: prefix + 'pending request', students: [{ value: viewers[6], label: 'Student' }], start: at(15), end: at(16), createdByStudent: true, isStudentRequest: true, approvalStatus: 'pending', preference: 'General' });
    if (ownEmails[info.project.name]) await seedTutorAvailabilityInEmulator('ui-calendar-surface-availability', { title: prefix + 'own availability', tutor: ownEmails[info.project.name], start: new Date('2026-10-14T16:00:00+11:00'), end: new Date('2026-10-14T17:00:00+11:00'), workType: ['work'], locationType: 'onsite' });
});
test.afterEach(async ({}, info) => {
    if (!prepared) return;
    for (const collection of Object.keys(snapshots)) {
        for (const doc of await list(collection)) {
            if (!snapshots[collection].has(doc.name) && doc.fields?.title?.stringValue?.startsWith(prefix)) await remove(`${collection}/${doc.name.split('/').pop()}`);
        }
    }
    await remove(`users/${tutorEmail}`);
    if (info.project.name === 'student-tests') {
        await help(helpBefore ? { hasSeenCalendarHelp: helpBefore } : {});
        if (eligibilityBefore) {
            const response = await fetch(`${root()}/studentTutorEligibility/${viewers[6]}`, { method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }, body: JSON.stringify({ fields: eligibilityBefore.fields }) });
            if (!response.ok) throw new Error('Cannot restore student eligibility fixture');
        } else await remove(`studentTutorEligibility/${viewers[6]}`);
    }
});

test('grid alignment, overlap, event opening and duplicate visibility preserve role permissions @teacherAdmin @tutorAdmin @teacherOnly @tutorOnly @coachOnly @coachTutor @studentOnly', async ({ page }, info) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await ready(page); await block(page).scrollIntoViewIfNeeded();
    const headers = await page.locator('.rbc-time-header-content .rbc-header').all();
    const columns = await page.locator('.rbc-day-slot').all(); expect(headers).toHaveLength(7); expect(columns).toHaveLength(7);
    for (let i = 0; i < 7; i++) {
        const head = await headers[i].boundingBox(); const column = await columns[i].boundingBox();
        expect(Math.abs(head.x - column.x)).toBeLessThan(2); expect(Math.abs(head.width - column.width)).toBeLessThan(2);
    }
    const primary = block(page); const overlap = block(page, prefix + 'overlapping coaching');
    await expect(overlap).toBeVisible();
    if (info.project.name !== 'student-tests') {
        const overlay = page.locator('.rbc-day-slot').nth(3).locator('.custom-time-slot-wrapper').filter({ has: page.getByText('GT', { exact: true }) }).first();
        await expect(overlay).toHaveCSS('pointer-events', 'none');
        expect(await overlay.evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
    }
    expect(await primary.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(204, 224, 255)');
    expect(await overlap.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(226, 180, 238)');
    await expect(primary.locator('.rbc-event-content[title]').first()).toHaveAttribute('title', new RegExp(mainTitle));
    const editable = ['admin-tests', 'tutorAdmin-tests', 'teacher-tests'].includes(info.project.name);
    await expect(primary.getByRole('button', { name: 'Duplicate event', exact: true })).toHaveCount(editable ? 1 : 0);
    expect(await primary.locator('.rbc-addons-dnd-resize-ns-anchor').count()).toBe(editable ? 2 : 0);
    await primary.click({ position: { x: 12, y: 16 } });
    await expect(page.getByRole('dialog', { name: editable ? 'Edit event' : 'Event details', exact: true })).toBeVisible(); await close(page);
    expect(iso((await read('shifts/ui-calendar-surface-main')).fields.start.timestampValue)).toBe(iso(at(11)));
    await page.screenshot({ path: `/tmp/calendar-surface-${info.project.name}.png` }); expect(errors).toEqual([]);
});

test('overlapping duplicate action works by mouse and keyboard without opening or dragging the source @teacherAdmin', async ({ page }) => {
    await ready(page); const primary = block(page); await primary.hover();
    const duplicate = primary.getByRole('button', { name: 'Duplicate event', exact: true });
    await duplicate.click();
    const created = async () => (await list('shifts')).filter(doc => doc.fields?.title?.stringValue === mainTitle && doc.name.split('/').pop() !== 'ui-calendar-surface-main');
    await expect.poll(async () => (await created()).length).toBe(1);
    expect(iso((await created())[0].fields.start.timestampValue)).toBe('2026-10-16T00:00:00.000Z');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await remove(`shifts/${(await created())[0].name.split('/').pop()}`); await expect.poll(async () => (await created()).length).toBe(0);
    await expect(primary).toHaveCount(1); // Wait for the Firestore snapshot to remove the first duplicate.
    await duplicate.focus(); await duplicate.press('Enter'); await expect.poll(async () => (await created()).length).toBe(1);
    expect(iso((await read('shifts/ui-calendar-surface-main')).fields.start.timestampValue)).toBe(iso(at(11)));
    await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('drag and resize persist the exact shifted interval and slot selection still opens create @teacherAdmin', async ({ page }) => {
    await ready(page); await dragTo(page, block(page), 3, 12);
    await expect.poll(async () => iso((await read('shifts/ui-calendar-surface-main')).fields.start.timestampValue)).toBe(iso(at(12)));
    expect(iso((await read('shifts/ui-calendar-surface-main')).fields.end.timestampValue)).toBe(iso(at(13)));
    await dragTo(page, block(page), 3, 14, true);
    await expect.poll(async () => iso((await read('shifts/ui-calendar-surface-main')).fields.end.timestampValue)).toBe(iso(at(14)));
    const target = await scrollToSlot(page, 4, 13); const box = await target.boundingBox();
    // RBC receives slot selection through its overlaid events container.
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.getByRole('dialog', { name: 'Add new event', exact: true })).toBeVisible(); await close(page);
});

test('own availability blocks keep their pattern, edit action and duplicate permission @tutorOnly @coachOnly @coachTutor', async ({ page }) => {
    await ready(page); const availability = block(page, prefix + 'own availability'); await availability.scrollIntoViewIfNeeded();
    expect(await availability.evaluate(el => getComputedStyle(el).borderLeftStyle)).toBe('dotted');
    await availability.hover(); await expect(availability.getByRole('button', { name: 'Duplicate event', exact: true })).toBeVisible();
    await availability.click({ position: { x: 12, y: 16 } }); await expect(page.getByRole('dialog', { name: 'Edit availability', exact: true })).toBeVisible(); await close(page);
});

test('month and phone views keep event opening, bounded layout and slot overlays @teacherAdmin', async ({ page }) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await ready(page); await page.getByRole('button', { name: 'Month', exact: true }).click(); await expect(page.locator('.rbc-month-view')).toBeVisible();
    await block(page).click(); await expect(page.getByRole('dialog', { name: 'Edit event', exact: true })).toBeVisible(); await close(page);
    await page.setViewportSize({ width: 375, height: 740 }); await page.getByRole('button', { name: 'Today', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Day', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await block(page).scrollIntoViewIfNeeded(); await expect(block(page)).toBeInViewport({ ratio: 1 });
    await expect.poll(() => page.locator('.rbc-calendar').evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    await block(page).click({ position: { x: 12, y: 16 } }); await expect(page.getByRole('dialog', { name: 'Edit event', exact: true })).toBeVisible(); await close(page);
    await page.screenshot({ path: '/tmp/calendar-surface-mobile.png' });
    expect(errors).toEqual([]);
});

test('student pending request keeps its duplicate action but blocks a next-day booking outside tutor availability @studentOnly', async ({ page }) => {
    // Use a future interval: main rejects past student requests before checking availability.
    const start = DateTime.now().setZone('Australia/Sydney').plus({ days: 2 }).set({ hour: 15, minute: 0, second: 0, millisecond: 0 }).toJSDate();
    const patched = await fetch(`${root()}/studentEventRequests/ui-calendar-surface-request?updateMask.fieldPaths=start&updateMask.fieldPaths=end`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
        body: JSON.stringify({ fields: { start: { timestampValue: start.toISOString() }, end: { timestampValue: new Date(+start + 3600000).toISOString() } } }),
    });
    expect(patched.ok).toBe(true);
    await page.goto(`/calendar?date=${encodeURIComponent(start.toISOString())}`);
    const request = block(page, prefix + 'pending request'); await expect(request).toBeVisible(); await request.hover();
    expect(await request.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(249, 210, 128)');
    const rejected = page.waitForResponse(response => new URL(response.url()).pathname === '/api/scheduling' && response.request().method() === 'POST');
    await request.getByRole('button', { name: 'Duplicate event', exact: true }).click();
    const response = await rejected;
    const result = await response.json();
    expect(result, JSON.stringify(result)).toMatchObject({ message: 'The tutor is no longer available for the full session.' });
    expect(response.status()).toBe(409);
    await expect(page.getByText('Failed to duplicate event: The tutor is no longer available for the full session.', { exact: true })).toBeVisible();
    expect((await list('studentEventRequests')).filter(doc => doc.fields?.title?.stringValue === prefix + 'pending request')).toHaveLength(1);
    expect(iso((await read('studentEventRequests/ui-calendar-surface-request')).fields.start.timestampValue)).toBe(iso(start));
    await expect(page.getByRole('dialog')).toHaveCount(0);
});
