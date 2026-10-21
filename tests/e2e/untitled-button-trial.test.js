import { test, expect } from '@playwright/test';
import { seedCanvasCourseInEmulator } from './wrapperFunctions';

test.describe('Untitled button compatibility trial @teacherAdmin', () => {
    test('renders styled buttons with independent mouse/keyboard behavior on desktop and mobile', async ({ page }) => {
        await page.goto('/ui-preview/button');
        await expect(page.getByRole('heading', { name: 'Canvas Classes button preview' })).toBeVisible();
        const current = page.getByRole('region', { name: 'Current button example', exact: true });
        const untitled = page.getByRole('region', { name: 'Untitled button example', exact: true });
        const button = untitled.getByRole('button');
        await expect(untitled.getByRole('region', { name: 'Sample students', includeHidden: true })).toBeHidden();
        await expect(button).toHaveCSS('border-radius', '8px');
        await expect(button).toHaveCSS('padding-top', '8px');
        await expect(button).toHaveCSS('font-weight', '600');
        await button.click();
        await expect(untitled.getByText('Jane Student', { exact: true })).toBeVisible();
        await expect(current.getByRole('region', { name: 'Sample students', includeHidden: true })).toBeHidden();
        await current.getByRole('button').click();
        await expect(current.getByText('Jane Student', { exact: true })).toBeVisible();
        await button.focus();
        await page.keyboard.press('Enter');
        await expect(untitled.getByRole('region', { name: 'Sample students', includeHidden: true })).toBeHidden();
        await page.keyboard.press('Space');
        await expect(untitled.getByText('Jane Student', { exact: true })).toBeVisible();
        await expect(button).toHaveAttribute('aria-expanded', 'true');
        await expect(button).toHaveCSS('outline-width', '2px');

        await page.setViewportSize({ width: 390, height: 844 });
        await button.scrollIntoViewIfNeeded();
        await expect(button).toBeInViewport({ ratio: 1 });
        await button.click();
        await expect(untitled.getByRole('region', { name: 'Sample students', includeHidden: true })).toBeHidden();
    });

    test('loading trial styles leaves the existing Classes styles unchanged after client navigation', async ({ page }) => {
        if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.startsWith('demo-')) {
            throw new Error('The button compatibility test requires a local demo Firebase project.');
        }
        await seedCanvasCourseInEmulator('ui-style-sentinel', { name: 'Style sentinel class', courseCode: 'STYLE' });
        await page.goto('/classes');
        const row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: 'Style sentinel class', exact: true }) });
        await expect(row).toBeVisible();
        const style = async (locator) => locator.evaluate(element => {
            const computed = getComputedStyle(element);
            return Object.fromEntries(['background-color', 'color', 'font-family', 'font-size', 'font-weight', 'padding', 'border-radius', 'box-shadow']
                .map(property => [property, computed.getPropertyValue(property)]));
        });
        await page.evaluate(() => document.fonts.ready);
        const before = { button: await style(row.getByRole('button')), search: await style(page.getByRole('textbox')) };
        await page.goto('/ui-preview/button');
        await expect(page.getByRole('heading', { name: 'Canvas Classes button preview' })).toBeVisible();
        await page.getByRole('link', { name: 'Open Canvas Classes', exact: true }).click();
        await expect(row).toBeVisible();
        expect(await style(row.getByRole('button'))).toEqual(before.button);
        expect(await style(page.getByRole('textbox'))).toEqual(before.search);
    });
});
