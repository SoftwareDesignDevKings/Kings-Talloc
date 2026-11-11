import { test, expect } from '@playwright/test';
import { DateTime } from 'luxon';
import { seedShiftInEmulator } from './wrapperFunctions';

test.use({ timezoneId: 'Australia/Sydney' });
test.setTimeout(90000);

const SHIFT_ID = 'ui-mobile-layout-shift';
const SHIFT_TITLE = 'Phone layout tutoring';
const documents = () => {
    const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const host = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
    if (!project?.startsWith('demo-') || !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) throw new Error('Phone layout checks require local demo emulators.');
    return `http://${host}/v1/projects/${project}/databases/(default)/documents`;
};
const tabBar = page => page.getByRole('navigation', { name: 'Main', exact: true });

test('phones swap the sidebar for a tab bar, page title and More sheet @teacherAdmin', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard');
    await expect(tabBar(page)).toBeVisible();
    await expect(page.getByRole('complementary')).toBeHidden();
    // No title bar on phones: the current tab names the page, with a hidden heading for screen readers.
    await expect(page.getByRole('heading', { level: 1, name: 'Dashboard', exact: true })).toHaveClass(/visually-hidden/);
    expect(await page.evaluate(() => [document.documentElement, document.body].map(el => getComputedStyle(el).overscrollBehaviorY))).toEqual(['none', 'none']);
    for (const label of ['Dashboard', 'Calendar', 'Hours']) await expect(tabBar(page).getByRole('link', { name: label, exact: true })).toBeInViewport({ ratio: 1 });
    await expect(tabBar(page).getByRole('link', { name: 'Dashboard', exact: true })).toHaveAttribute('aria-current', 'page');

    await tabBar(page).getByRole('button', { name: 'More', exact: true }).click();
    const more = page.getByRole('dialog', { name: 'More', exact: true });
    await expect(more.getByText('computing@kings.edu.au', { exact: true })).toBeVisible();
    for (const label of ['View as Teacher', 'Log out']) await expect(more.getByRole('button', { name: label, exact: true })).toBeVisible();
    await more.getByRole('link', { name: 'Manage users', exact: true }).click();
    await expect(page).toHaveURL(/\/userRoles$/);
    await expect(more).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: 'Manage users', exact: true })).toHaveClass(/visually-hidden/);
    await expect(tabBar(page).getByRole('button', { name: 'More', exact: true })).toHaveAttribute('aria-current', 'page');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(tabBar(page)).toBeHidden();
    await expect(page.getByRole('complementary')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Manage users', exact: true })).toBeVisible();
});

test('a tapped tab highlights at once and covers the old page until the next one loads @teacherAdmin', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard');
    await expect(tabBar(page)).toBeVisible();
    // Hold the Calendar page's server response so the in-between state can be checked.
    let release;
    const held = new Promise(resolve => { release = resolve; });
    await page.route(url => url.pathname === '/calendar', async route => { await held; await route.continue(); });
    await tabBar(page).getByRole('link', { name: 'Calendar', exact: true }).click();
    await expect(tabBar(page).getByRole('link', { name: 'Calendar', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(tabBar(page).getByRole('link', { name: 'Dashboard', exact: true })).not.toHaveAttribute('aria-current', 'page');
    const spinner = page.locator('[data-loading-indicator]').first();
    await expect(spinner).toBeVisible();
    const box = await spinner.locator('span').first().boundingBox();
    expect(Math.abs(box.y + box.height / 2 - 844 / 2)).toBeLessThan(80);
    release();
    await expect(page).toHaveURL(/\/calendar$/);
    await expect(page.locator('.rbc-calendar')).toBeVisible();
    await expect(page.locator('[data-loading-indicator]')).toHaveCount(0);
});

test('a rate-limited page explains itself and retries instead of showing a blank page @teacherAdmin', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/429');
    await expect(page.getByRole('heading', { name: 'Talloc is busy', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try now', exact: true })).toBeVisible();
});

test.describe('phone calendar booking flow @studentOnly', () => {
    test.beforeEach(async () => {
        documents();
        const start = DateTime.now().setZone('Australia/Sydney').set({ hour: 12, minute: 0, second: 0, millisecond: 0 }).toJSDate();
        await seedShiftInEmulator(SHIFT_ID, {
            title: SHIFT_TITLE, workType: 'tutoring', start, end: new Date(+start + 3600000), recurring: null, workStatus: 'notCompleted',
            staff: [{ value: 'tutor@kings.edu.au', label: 'Phone Fixture Tutor' }], students: [{ value: 'student@kings.edu.au', label: 'Phone Fixture Student' }],
            emailsList: ['tutor@kings.edu.au', 'student@kings.edu.au'], staffEmails: ['tutor@kings.edu.au'], studentEmails: ['student@kings.edu.au'],
            locationType: 'onsite', description: 'Phone fixture notes',
        });
    });
    test.afterEach(async () => {
        const response = await fetch(`${documents()}/shifts/${SHIFT_ID}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Cannot remove phone layout fixture');
    });

    test('the + button opens a request and a booking opens as a summary', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/calendar');
        await expect(page.locator('.rbc-calendar')).toBeVisible();
        await page.locator('.rbc-toolbar').getByRole('button', { name: 'Today', exact: true }).click();

        const request = page.getByRole('button', { name: 'Request session', exact: true });
        await expect(request).toBeInViewport({ ratio: 1 });
        await request.click();
        await expect(page.getByRole('dialog', { name: 'Request a session', exact: true })).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog', { name: 'Request a session', exact: true })).toHaveCount(0);

        await page.locator('.rbc-toolbar').getByRole('button', { name: 'List', exact: true }).click();
        await page.locator('.rbc-agenda-event-cell').filter({ hasText: SHIFT_TITLE }).click();
        const summary = page.getByRole('dialog', { name: 'Event details', exact: true }).getByRole('region', { name: 'Booking summary', exact: true });
        await expect(summary.getByRole('heading', { name: SHIFT_TITLE, exact: true })).toBeVisible();
        for (const text of ['Phone Fixture Tutor', 'On site', 'Phone fixture notes']) await expect(summary.getByText(text, { exact: true })).toBeVisible();
    });
});
