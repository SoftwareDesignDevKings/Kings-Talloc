import { test, expect } from '@playwright/test';
import { clearFirestoreEmulator, confirmAction } from './wrapperFunctions.js';

test.describe('Tutor Workflow @tutorOnly', () => {
    test.beforeEach(async () => {
        await clearFirestoreEmulator();
    });

    test('tutor adds availability, admin converts to shift, tutor marks completed', async ({ page, browser }) => {
        // ===== STEP 1: Tutor adds availability =====
        await page.goto('/dashboard');
        await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible();
        await page.getByRole('link', { name: 'Calendar' }).click();

        await page.locator('.rbc-events-container').nth(2).click();

        await page.getByRole('button', { name: /Location type/ }).click();
        await expect(page.getByRole('option', { name: 'Remote' })).toBeVisible();
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');

        await expect(page.getByRole('button', { name: 'Add Availability' })).toBeVisible();
        await page.getByRole('button', { name: 'Add Availability' }).click();

        const availabilityButton = page
            .getByRole('button', { name: /\d+:\d+(\s?[ap]m)? – \d+:\d+\s?[ap]m/i })
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

            await adminPage.locator('.rbc-events-container').nth(2).click();

            await expect(adminPage.getByRole('textbox', { name: 'Event title' })).toBeVisible();
            await adminPage.getByRole('textbox', { name: 'Event title' }).fill('Tutor Workflow Shift');

            await expect(adminPage.getByRole('button', { name: 'Participants' })).toBeVisible();
            await adminPage.getByRole('button', { name: 'Participants' }).click();

            await adminPage.getByRole('button', { name: 'Assign tutors to event', exact: true }).click();

            await expect(adminPage.getByRole('option', { name: /Viraj Patel/i })).toBeVisible();
            await adminPage.getByRole('option', { name: /Viraj Patel/i }).click();

            await expect(adminPage.getByRole('button', { name: 'Add Event' })).toBeVisible();
            await adminPage.getByRole('button', { name: 'Add Event' }).click();
            await expect(adminPage.getByRole('button', { name: /Tutor Workflow Shift/ })).toBeVisible();
        } finally {
            await adminContext.close();
        }

        // ===== STEP 3: Tutor opens the shift and marks it Completed =====
        await page.reload();
        await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible();
        await page.getByRole('link', { name: 'Calendar' }).click();

        await expect(page.getByRole('button', { name: /Tutor Workflow Shift/ })).toBeVisible();
        await page.getByRole('button', { name: /Tutor Workflow Shift/ }).first().click();

        await expect(page.getByRole('button', { name: 'Settings & Status' })).toBeVisible();
        await page.getByRole('button', { name: 'Settings & Status' }).click();
        await page.getByRole('button', { name: /Event work status/ }).click();

        await expect(page.getByRole('option', { name: 'Completed', exact: true })).toBeVisible();
        await page.getByRole('option', { name: 'Completed', exact: true }).click();

        await expect(page.getByRole('button', {name : 'Save Status' })).toBeVisible();
        await page.getByRole('button', { name: 'Save Status' }).click();

        await expect(page.getByRole('button', { name: /Tutor Workflow Shift/ })).toBeVisible();
        await page.getByRole('button', { name: /Tutor Workflow Shift/ }).first().click();

        await expect(page.getByRole('button', { name: 'Settings & Status' })).toBeVisible();
        await page.getByRole('button', { name: 'Settings & Status' }).click();
        await expect(page.getByRole('button', { name: /Event work status/ })).toBeVisible();
    });

    test('tutor adds availability, tutor delete availability', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible();
        await page.getByRole('link', { name: 'Calendar' }).click();

        await page.locator('.rbc-events-container').nth(3).click();

        await expect(page.getByRole('button', {name: 'Add Availability' })).toBeVisible();
        await page.getByRole('button', { name: 'Add Availability' }).click();

        const availabilityButton = page
            .getByRole('button', { name: /\d+:\d+(\s?[ap]m)? – \d+:\d+\s?[ap]m/i })
            .first();
        await expect(availabilityButton).toBeVisible();

        await page.getByRole('button', { name: /Availability/ }).first().click();

        await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
        await confirmAction(page, /Delete this availability\?/, () => page.getByRole('button', { name: 'Delete' }).click());
        await expect(page.getByRole('button', { name: /Availability/ }).first()).not.toBeVisible();

    });
});
