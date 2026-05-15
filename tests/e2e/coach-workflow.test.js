import { test, expect } from '@playwright/test';
import { clearFirestoreEmulator, seedShiftInEmulator } from './wrapperFunctions.js';

test.describe('Coach Workflow @coachOnly', () => {
    test.beforeEach(async () => {
        await clearFirestoreEmulator();
    });

    test('coach adds availability, sees assigned shift, and marks it completed', async ({ page }) => {
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

        // ===== STEP 2: Seed an assigned coaching shift =====
        const shiftStart = new Date();
        shiftStart.setHours(9, 30, 0, 0);
        const shiftEnd = new Date(shiftStart);
        shiftEnd.setMinutes(shiftEnd.getMinutes() + 30);

        await seedShiftInEmulator('coach-workflow-shift', {
            title: 'Coach Workflow Shift',
            start: shiftStart,
            end: shiftEnd,
            description: '',
            confirmationRequired: false,
            staff: [{ value: 'coach@kings.edu.au', label: 'Max Burykin', roles: ['coach'] }],
            classes: [],
            students: [],
            tutorResponses: [],
            studentResponses: [],
            minStudents: 0,
            createdByStudent: false,
            approvalStatus: 'pending',
            workStatus: 'notCompleted',
            workType: 'coaching',
            locationType: '',
            subject: null,
            preference: null,
            recurring: null,
            until: null,
            emailsList: ['coach@kings.edu.au'],
        });

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

    test('tutor adds availability, tutor delete availability', async ({ page }) => {
        await page.goto('/dashboard');

        await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible();
        await page.getByRole('link', { name: 'Calendar' }).click();
        const initialAvailabilityCount = await page.getByRole('button', { name: /Availability/ }).count();

        await page.locator('.rbc-events-container').nth(4).click();

        await expect(page.getByRole('button', {name: 'Add Availability' })).toBeVisible();
        await page.getByRole('button', { name: 'Add Availability' }).click();

        const availabilityButton = page
            .getByRole('button', { name: /\d+:\d+\s?(AM|PM).*–.*\d+:\d+\s?(AM|PM)/ })
            .first();
        await expect(availabilityButton).toBeVisible();

        await availabilityButton.click();

        await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
        await page.getByRole('button', { name: 'Delete' }).click();
        await expect(page.getByRole('button', { name: /Availability/ })).toHaveCount(initialAvailabilityCount);

    });
});
