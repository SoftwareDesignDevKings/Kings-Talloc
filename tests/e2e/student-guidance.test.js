import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

const student = 'student@kings.edu.au';
const flags = ['hasSeenWelcome', 'hasSeenCalendarHelp'];
const base = () => {
    const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const host = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
    if (!project?.startsWith('demo-') || !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) throw new Error('Guidance checks require local demo emulators.');
    return `http://${host}/v1/projects/${project}/databases/(default)/documents/users/${student}`;
};
const readStudent = async () => { const response = await fetch(base()); expect(response.ok).toBe(true); return (await response.json()).fields; };
const patchFlags = async fields => {
    const query = flags.map(flag => `updateMask.fieldPaths=${flag}`).join('&');
    const response = await fetch(`${base()}?${query}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
    if (!response.ok) throw new Error(`Cannot patch demo guidance flags (${response.status}): ${await response.text()}`);
};
const welcome = page => page.getByRole('dialog', { name: 'Welcome to Kings Talloc', exact: true });
const help = page => page.getByRole('dialog', { name: 'How to use the calendar', exact: true });
const copy = dialog => dialog.evaluate(el => el.textContent.replace(/\s+/g, ''));
const expectFits = async dialog => {
    await expect(dialog).toHaveCSS('opacity', '1');
    await expect.poll(() => dialog.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    const bounds = await dialog.boundingBox(); expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(await dialog.page().evaluate(() => innerHeight));
};
const openHelp = async page => {
    const expand = page.getByRole('button', { name: 'Expand filters', exact: true });
    if (await expand.count()) await expand.click();
    await page.getByRole('button', { name: 'Help', exact: true }).click(); await expect(help(page)).toBeVisible();
};
const withoutFlags = fields => Object.fromEntries(Object.entries(fields).filter(([key]) => !flags.includes(key)));

test.describe('Student guidance @studentOnly', () => {
    let original;
    test.beforeEach(async () => {
        original = await readStudent();
        await patchFlags(Object.fromEntries(flags.map(flag => [flag, { booleanValue: false }])));
    });
    test.afterEach(async () => {
        try { expect(withoutFlags(await readStudent())).toEqual(withoutFlags(original)); }
        finally { await patchFlags(Object.fromEntries(flags.filter(flag => original[flag]).map(flag => [flag, original[flag]]))); }
    });
    test('first visits preserve all copy, independent seen flags and manual help reopening', async ({ page }) => {
        await page.goto('/dashboard'); await expect(welcome(page)).toBeVisible(); await expectFits(welcome(page));
        const content = { welcome: await copy(welcome(page)) };
        await expect(welcome(page).getByText('Calendar colour guide', { exact: true })).toBeVisible();
        await welcome(page).getByRole('button', { name: 'Get Started', exact: true }).click();
        await expect(welcome(page)).toHaveCount(0);
        await expect.poll(async () => (await readStudent()).hasSeenWelcome).toEqual({ booleanValue: true });
        expect((await readStudent()).hasSeenCalendarHelp).toEqual({ booleanValue: false });
        await page.reload(); await expect(page.getByRole('heading', { name: 'Student Dashboard', exact: true })).toBeVisible();
        await expect(welcome(page)).toHaveCount(0);
        await page.goto('/calendar'); await expect(help(page)).toBeVisible(); await expectFits(help(page));
        content.help = await copy(help(page));
        for (const [label, id] of [['What do the colours mean?', 'colorsSection'], ['Using the filters', 'filterPanelSection'], ['Working with sessions', 'interactionsSection']]) {
            const button = help(page).getByRole('button', { name: label, exact: true });
            if (await button.getAttribute('aria-expanded') !== 'true') await button.click();
            await expect(button).toHaveAttribute('aria-expanded', 'true');
            await expect(help(page).locator(`#${id}`)).toBeVisible();
            await button.click(); await expect(help(page).locator(`#${id}`)).toBeHidden();
        }
        await expect(help(page).getByRole('link', { name: 'mienna@kings.edu.au', exact: true })).toHaveAttribute('href', 'mailto:mienna@kings.edu.au');
        if (process.env.GUIDANCE_COPY_OUTPUT) await writeFile(process.env.GUIDANCE_COPY_OUTPUT, JSON.stringify(content));
        if (process.env.GUIDANCE_COMPARE_COPY) expect(content).toEqual(JSON.parse(await readFile(process.env.GUIDANCE_COMPARE_COPY, 'utf8')));
        await help(page).getByRole('button', { name: 'Got it', exact: true }).click(); await expect(help(page)).toHaveCount(0);
        await expect.poll(async () => (await readStudent()).hasSeenCalendarHelp).toEqual({ booleanValue: true });
        await page.reload(); await expect(page.getByRole('button', { name: 'Today', exact: true })).toBeVisible();
        await expect(help(page)).toHaveCount(0);
        await openHelp(page); await page.keyboard.press('Escape'); await expect(help(page)).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Help', exact: true })).toBeFocused();
    });
    test('both dialogs fit a small phone and close by keyboard or header without changing other fields', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 568 });
        await page.goto('/dashboard'); await expect(welcome(page)).toBeVisible(); await expectFits(welcome(page));
        const start = welcome(page).getByRole('button', { name: 'Get Started', exact: true });
        await start.focus(); await expect(start).toBeInViewport({ ratio: 1 }); await page.keyboard.press('Enter');
        await expect(welcome(page)).toHaveCount(0);
        await page.goto('/calendar'); await expect(help(page)).toBeVisible(); await expectFits(help(page));
        const events = help(page).getByRole('button', { name: 'Working with sessions', exact: true });
        await events.focus(); await page.keyboard.press('Space'); await expect(events).toHaveAttribute('aria-expanded', 'true');
        await help(page).getByRole('button', { name: 'Close', exact: true }).click(); await expect(help(page)).toHaveCount(0);
        await expect.poll(async () => (await readStudent()).hasSeenCalendarHelp).toEqual({ booleanValue: true });
        // Phones reach Filters, including its manual Help trigger, from the calendar toolbar.
        await expect(page.getByRole('button', { name: 'Help', exact: true })).toHaveCount(0);
        await page.getByRole('button', { name: 'Filters', exact: true }).click();
        await page.getByRole('dialog', { name: 'Filters', exact: true }).getByRole('button', { name: 'Help', exact: true }).click();
        await expect(help(page)).toBeVisible(); await expectFits(help(page));
    });
});

test('staff do not receive student welcome or student-only Calendar Help @teacherAdmin', async ({ page }) => {
    const before = await readStudent();
    await page.goto('/dashboard'); await expect(page.getByRole('heading', { name: 'Admin Dashboard', exact: true })).toBeVisible();
    await expect(welcome(page)).toHaveCount(0);
    await page.goto('/calendar'); await expect(page.getByRole('button', { name: 'Today', exact: true })).toBeVisible();
    await expect(help(page)).toHaveCount(0); await expect(page.getByRole('button', { name: 'Help', exact: true })).toHaveCount(0);
    expect(await readStudent()).toEqual(before);
});
