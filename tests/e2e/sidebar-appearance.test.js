import { test, expect } from '@playwright/test';

test('sidebar active state, keyboard focus, and controls remain clear at desktop and narrow mobile sizes @teacherAdmin @tutorAdmin', async ({ page }) => {
    await page.goto('/userRoles');
    await expect(page.getByRole('heading', { name: 'Manage Users', exact: true })).toBeVisible();
    const sidebar = page.getByRole('complementary');
    const menu = sidebar.getByRole('navigation', { name: 'Menu', exact: true });
    const active = menu.getByRole('link', { name: 'Manage Users', exact: true });
    await expect(active).toHaveAttribute('aria-current', 'page');
    await expect(menu.locator('[aria-current="page"]')).toHaveCount(1);
    await expect(active).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await active.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(active).toBeFocused();
    await expect(active).toHaveCSS('outline-style', 'solid');
    await expect(active).toHaveCSS('outline-width', '2px');

    for (const [width, height] of [[1280, 900], [846, 740], [390, 740], [320, 568]]) {
        await page.setViewportSize({ width, height });
        const expand = sidebar.getByRole('button', { name: 'Expand sidebar', exact: true });
        if (width < 768) await expect(expand).toBeVisible();
        if (await expand.count()) await expand.click();
        await expect(sidebar).toHaveCSS('--sidebar-w', '16rem');
        // Wait for the width transition before measuring containment.
        await expect.poll(() => sidebar.evaluate(el => Math.abs(el.getBoundingClientRect().width - 16 * parseFloat(getComputedStyle(document.documentElement).fontSize)))).toBeLessThan(0.5);
        for (const control of await sidebar.locator('a, button').all()) {
            await expect(control).toBeInViewport({ ratio: 1 });
            expect(await control.evaluate(el => {
                const parent = el.closest('aside').getBoundingClientRect();
                const rect = el.getBoundingClientRect();
                return rect.left >= parent.left && rect.right <= parent.right;
            })).toBe(true);
        }
        await sidebar.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
        await expect(sidebar).toHaveCSS('--sidebar-w', '5rem');
        await expect.poll(() => sidebar.evaluate(el => Math.abs(el.getBoundingClientRect().width - 5 * parseFloat(getComputedStyle(document.documentElement).fontSize)))).toBeLessThan(0.5);
        for (const control of await sidebar.locator('a, button').all()) await expect(control).toBeInViewport({ ratio: 1 });
        await expect(active).toHaveAccessibleName('Manage Users');
        await expect(sidebar.getByRole('button', { name: 'Logout', exact: true })).toBeVisible();
        await expect.poll(() => sidebar.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    }
});
