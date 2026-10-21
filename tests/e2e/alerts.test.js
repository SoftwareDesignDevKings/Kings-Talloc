import { test, expect } from '@playwright/test';
import { fillEventDateTime } from './dateTimePickerHelpers';

test.setTimeout(60000);
const message = 'Alert UI check ';
const action = page => page.getByRole('button', { name: 'Email shift notifications', exact: true });
const alerts = page => page.getByRole('alert').filter({ has: page.getByText(new RegExp('^' + message)) });
const clock = async page => {
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
};
const setup = async page => {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.startsWith('demo-')) throw new Error('Alerts checks require the local demo application');
    let outcome = { status: 200, text: message + 'success' };
    // Every email request is fulfilled locally. These checks send no messages,
    // create no meetings and write no database fixtures.
    await page.route('**/api/send-emails', route => route.fulfill({ status: outcome.status, json: { message: outcome.text } }));
    await page.goto('/dashboard'); await expect(action(page)).toBeEnabled();
    return async (status, text, keyboard = false) => {
        outcome = { status, text };
        if (keyboard) { await action(page).focus(); await action(page).press('Enter'); }
        else await action(page).click();
        await expect(page.getByRole('alert').filter({ hasText: text }).last()).toBeVisible();
        await expect(action(page)).toBeEnabled();
    };
};

test('success warning and error messages preserve content, manual close and oldest-first Escape @teacherAdmin', async ({ page }) => {
    const send = await setup(page);
    for (const [status, type] of [[200, 'success'], [500, 'warning'], [400, 'error']]) {
        await send(status, message + type);
        const alert = alerts(page).filter({ hasText: message + type });
        await expect(alert).toHaveAttribute('aria-live', 'assertive');
        await expect(alert).toHaveAttribute('aria-atomic', 'true');
    }
    await expect.poll(() => alerts(page).evaluateAll(elements => elements.every(el => Number(getComputedStyle(el).opacity) === 1))).toBe(true);
    await page.screenshot({ path: '/tmp/alerts-types.png' });
    await alerts(page).filter({ hasText: message + 'warning' }).getByRole('button', { name: 'Close', exact: true }).click();
    await expect(alerts(page)).toHaveCount(2);
    await page.keyboard.press('Escape');
    await expect(alerts(page)).toHaveCount(1);
    await expect(alerts(page)).toHaveText(message + 'error');
});

test('repeated messages keep separate timers and navigation clears the stack @teacherAdmin', async ({ page }) => {
    const send = await setup(page); await clock(page);
    await send(200, message + 'repeat'); await page.clock.runFor(3000);
    await send(200, message + 'repeat'); await page.clock.runFor(2500);
    await expect(alerts(page)).toHaveCount(1);
    await page.getByRole('link', { name: 'Calendar', exact: true }).click();
    await expect(page.locator('.rbc-calendar')).toBeVisible();
    await expect(alerts(page)).toHaveCount(0);
});

test('hover and keyboard focus pause dismissal and leaving restarts five seconds @teacherAdmin', async ({ page }) => {
    const send = await setup(page); await clock(page);
    await send(500, message + 'pause'); await page.clock.runFor(200);
    await alerts(page).hover(); await page.clock.runFor(6000); await expect(alerts(page)).toHaveCount(1);
    await action(page).hover(); await page.clock.runFor(4000); await expect(alerts(page)).toHaveCount(1);
    await page.clock.runFor(1500); await expect(alerts(page)).toHaveCount(0);
    await send(400, message + 'focus'); await page.clock.runFor(200);
    await alerts(page).getByRole('button', { name: 'Close', exact: true }).focus();
    await page.clock.runFor(6000); await expect(alerts(page)).toHaveCount(1);
    await action(page).focus(); await page.clock.runFor(5500); await expect(alerts(page)).toHaveCount(0);
});

test('long messages and a tall stack fit a narrow viewport and remain dismissible @teacherAdmin', async ({ page }) => {
    const send = await setup(page); await page.setViewportSize({ width: 320, height: 568 }); await clock(page);
    const long = message + 'long ' + 'unbroken-message-'.repeat(25);
    await send(400, long);
    await page.clock.runFor(200);
    const alert = alerts(page).filter({ hasText: long });
    await expect(alert).toBeInViewport({ ratio: 1 });
    expect(await alert.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: '/tmp/alerts-mobile.png', animations: 'disabled' });
    await alert.getByRole('button', { name: 'Close', exact: true }).click(); await page.clock.runFor(200); await expect(alert).toHaveCount(0);
    for (let i = 0; i < 6; i++) await send(200, message + 'stack ' + i, true);
    const last = alerts(page).last(); await last.getByRole('button', { name: 'Close', exact: true }).click(); await page.clock.runFor(200);
    await expect(alerts(page)).toHaveCount(5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.keyboard.press('Escape'); await page.clock.runFor(200); await expect(alerts(page)).toHaveCount(4);
});

test('calendar validation alerts stay readable and dismissible above an open dialog @teacherAdmin', async ({ page }) => {
    await setup(page);
    await page.goto('/calendar');
    await expect(page.locator('.rbc-calendar')).toBeVisible();
    await page.getByRole('button', { name: 'Day', exact: true }).click();
    const slot = page.locator('.rbc-day-slot .rbc-time-slot').nth(24);
    await slot.scrollIntoViewIfNeeded(); const box = await slot.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    const dialog = page.getByRole('dialog', { name: 'Add new event', exact: true });
    await expect(dialog).toBeVisible();
    await fillEventDateTime(page, 'start', '2026-10-16T17:00');
    await fillEventDateTime(page, 'end', '2026-10-16T16:00');
    await dialog.getByRole('button', { name: 'Add event', exact: true }).click();
    const alert = page.getByRole('alert').filter({ hasText: 'End date must be after the start date.' });
    await expect(alert).toBeVisible();
    await expect(dialog).toBeVisible();
    await alert.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(alert).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).toHaveCount(0);
});
