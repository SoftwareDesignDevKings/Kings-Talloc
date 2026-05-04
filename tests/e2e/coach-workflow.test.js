import { test, expect } from '@playwright/test';
import { clearFirestoreEmulator } from './wrapperFunctions.js';

test.describe('Coach Workflow @coachOnly', () => {
    test.beforeAll(async () => {
        await clearFirestoreEmulator();
    });

    test('coach adds availability, admin converts to shift, coach marks completed', async ({ page, browser }) => {
        // ===== STEP 1: Coach adds availability =====
        await page.goto('/dashboard');
        await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible();
        await page.getByRole('link', { name: 'Calendar' }).click();

        await page.locator('.rbc-events-container').nth(3).click();

        await expect(page.getByRole('button', {name: 'Add Availability' })).toBeVisible();
        await page.getByRole('button', { name: 'Add Availability' }).click();

        const availabilityButton = page
            .getByRole('button', { name: /\d+:\d+\s?(AM|PM).*–.*\d+:\d+\s?(AM|PM)/ })
            .first();
        await expect(availabilityButton).toBeVisible();

        // ===== STEP 2: Admin converts the availability into a shift =====
        const adminContext = await browser.newContext({
            storageState: 'tests/e2e/.auth/teacherAdmin.json',
        });
        const adminPage = await adminContext.newPage();

        try {
            await adminPage.goto('/dashboard');
            await expect(adminPage.getByRole('link', { name: 'Calendar' })).toBeVisible();
            await adminPage.getByRole('link', { name: 'Calendar' }).click();

            await adminPage.locator('.rbc-events-container').nth(3).click();

            await expect(adminPage.getByRole('textbox', { name: 'Event title' })).toBeVisible();
            await adminPage.getByRole('textbox', { name: 'Event title' }).fill('Coach Workflow Shift');

            await expect(adminPage.getByRole('button', { name: 'Participants' })).toBeVisible();
            await adminPage.getByRole('button', { name: 'Participants' }).click();

            await adminPage.locator('.mb-4 > .css-b62m3t-container > .select__control > .select__value-container > .select__input-container').click();

            await expect(adminPage.getByRole('option', { name: /Max Burykin/i })).toBeVisible();
            await adminPage.getByRole('option', { name: /Max Burykin/i }).click();

            await expect(adminPage.getByRole('button', { name: 'Add Event' })).toBeVisible();
            await adminPage.getByRole('button', { name: 'Add Event' }).click();
            await expect(adminPage.getByRole('button', { name: /Coach Workflow Shift/ })).toBeVisible();
        } finally {
            await adminContext.close();
        }

        // ===== STEP 3: Coach opens the shift and marks it Completed =====
        await page.reload();
        await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible();
        await page.getByRole('link', { name: 'Calendar' }).click();

        await expect(page.getByRole('button', { name: /Coach Workflow Shift/ })).toBeVisible();
        await page.getByRole('button', { name: /Coach Workflow Shift/ }).first().click();

        await expect(page.getByRole('button', { name: 'Settings & Status' })).toBeVisible();
        await page.getByRole('button', { name: 'Settings & Status' }).click();
        await page.locator('div').filter({ hasText: /^Not Completed$/ }).nth(1).click();
        await page.getByRole('option', { name: 'Completed', exact: true }).click();

        await expect(page.getByRole('button', {name : 'Save Status' })).toBeVisible();
        await page.getByRole('button', { name: 'Save Status' }).click();

        await expect(page.getByRole('button', { name: /Coach Workflow Shift/ })).toBeVisible();
        await page.getByRole('button', { name: /Coach Workflow Shift/ }).first().click();

        await expect(page.getByRole('button', { name: 'Settings & Status' })).toBeVisible();
        await page.getByRole('button', { name: 'Settings & Status' }).click();
        await expect(page.locator('div').filter({ hasText: /^Completed$/ }).nth(1)).toBeVisible();
    });

    test('coach adds availability, coach delete availability', async ({ page }) => {
        await page.goto('/dashboard');

        await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible();
        await page.getByRole('link', { name: 'Calendar' }).click();

        await page.locator('.rbc-events-container').nth(4).click();

        await expect(page.getByRole('button', {name: 'Add Availability' })).toBeVisible();
        await page.getByRole('button', { name: 'Add Availability' }).click();

        const availabilityButton = page
            .getByRole('button', { name: /\d+:\d+\s?(AM|PM).*–.*\d+:\d+\s?(AM|PM)/ })
            .first();
        await expect(availabilityButton).toBeVisible();

        await expect(page.getByRole('button', { name: /Availability/ })).toBeVisible();
        await page.getByRole('button', { name: /Availability/ }).first().click();

        await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
        await page.getByRole('button', { name: 'Delete' }).click();
        await expect(page.getByRole('button', { name: /Availability/ }).first()).not.toBeVisible();

    });
});
