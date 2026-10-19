import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { clearFirestoreEmulator } from './wrapperFunctions.js';

test.describe('Admin Workflow @teacherAdmin', () => {
    test.beforeEach(async ({ page }) => {
        await clearFirestoreEmulator();
        await page.goto('/dashboard');
    });

    // ==========================================
    // SUITE 1: Canvas Setup
    // ==========================================
    test.describe('System Setup', () => {
        test('should show Canvas admin controls', async ({ page }) => {
            await expect(page.getByRole('link', { name: 'Canvas Admin' })).toBeVisible();
            await page.getByRole('link', { name: 'Canvas Admin' }).click();

            await expect(page.getByRole('heading', { name: 'Canvas Admin' })).toBeVisible();
            await expect(page.getByRole('button', { name: /Run Sync/i })).toBeVisible();
            await expect(page.getByRole('tab', { name: /Whitelisted/i })).toBeVisible();
            await expect(page.getByRole('tab', { name: /All Canvas Courses/i })).toBeVisible();
        });

        test('should show read-only Canvas classes', async ({ page }) => {
            await expect(page.getByRole('link', { name: 'Canvas Classes' })).toBeVisible();
            await page.getByRole('link', { name: 'Canvas Classes' }).click();

            await expect(page.getByRole('heading', { name: 'Canvas Classes' })).toBeVisible();
            await expect(page.getByPlaceholder('Search by Canvas class or code')).toBeVisible();
            await expect(page.getByRole('button', { name: 'Add Class' })).toBeHidden();
        });
    });

    // ==========================================
    // SUITE 2: Scheduling & MS Teams
    // ==========================================
    test.describe('Calendar & Scheduling', () => {
        test.beforeEach(async ({ page }) => {
            await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible();
            await page.getByRole('link', { name: 'Calendar' }).click();
        });

        test('should create an event with a mocked MS Teams link', async ({ page }) => {

            await page.locator('.rbc-events-container').first().click();
            await expect(page.getByRole('textbox', { name: 'Event title' })).toBeVisible();
            await page.getByRole('textbox', { name: 'Event title' }).fill('Software');

            await page.getByRole('button', { name: 'Participants' }).click();
            await page.getByRole('button', { name: 'Assign tutors to event', exact: true }).click();
            await page.getByRole('option', { name: /Viraj Patel/i }).click();

            await expect(page.getByRole('button', {name: 'General Information' })).toBeVisible();
            await page.getByRole('button', { name: 'General Information' }).click();

            await expect(page.getByRole('button', { name: 'Add online Teams meeting' })).toBeVisible();
            await page.getByRole('button', { name: 'Add online Teams meeting' }).click();

            await expect(page.getByRole('button', {name: 'Add Event' })).toBeVisible();
            await page.getByRole('button', { name: 'Add Event' }).click();

            await expect(page.getByText('Teams meeting created')).toBeVisible();

            await expect(page.getByRole('button', { name: /Software \(VP\)/ })).toBeVisible();
            await page.getByRole('button', { name: /Software \(VP\)/ }).click();

            await expect(page.getByRole('link', { name: /Join Now/i })).toBeVisible();
            await expect(page.getByRole('link', { name: /Join Now/i })).toHaveAttribute(
                'href',
                'https://teams.microsoft.com/l/meetup-join/dev-mock-meeting',
            );
        });

        test('an event form works while the Bootstrap script is still loading', async ({ context }) => {
            const delayedPage = await context.newPage();
            let releaseBootstrap;
            const ready = new Promise(resolve => { releaseBootstrap = resolve; });
            await delayedPage.route('**/bootstrap.bundle.min.js', async route => {
                await ready;
                await route.fulfill({ contentType: 'application/javascript', body: readFileSync('node_modules/bootstrap/dist/js/bootstrap.bundle.min.js', 'utf8') });
            });
            try {
                await delayedPage.goto('/calendar', { waitUntil: 'domcontentloaded' });
                await delayedPage.locator('.rbc-events-container').nth(1).click();
                const title = delayedPage.getByRole('textbox', { name: 'Event title', includeHidden: true });
                await expect(title).toHaveCount(1);
                await expect(title).toBeVisible();
                releaseBootstrap();
                await expect(delayedPage.getByRole('textbox', { name: 'Event title' })).toBeVisible();
                await delayedPage.getByRole('button', { name: 'Close', exact: true }).click();
                await expect(title).toBeHidden();
            } finally {
                releaseBootstrap();
                await delayedPage.close();
            }
        });

        test('should edit workTypes, statuses, and delete events', async ({ page }) => {


            // Create a fresh event (DB was cleared by beforeEach)
            await page.locator('.rbc-events-container').nth(1).click();

            await expect(page.getByRole('textbox', { name: 'Event title' })).toBeVisible();
            await page.getByRole('textbox', { name: 'Event title' }).fill('Software Lesson');

            await expect(page.getByRole('button', { name: 'Participants' })).toBeVisible();
            await page.getByRole('button', { name: 'Participants' }).click();

            await page.getByRole('button', { name: 'Assign tutors to event', exact: true }).click();

            await expect(page.getByRole('option', { name: /Viraj Patel/i })).toBeVisible();
            await page.getByRole('option', { name: /Viraj Patel/i }).click();

            await expect(page.getByRole('button', { name: 'Add Event' })).toBeVisible();
            await page.getByRole('button', { name: 'Add Event' }).click();

            // Work remains the academic type
            await expect(page.getByRole('button', { name: /Software Lesson/ })).toBeVisible();
            await page.getByRole('button', { name: /Software Lesson/ }).first().click();

            await expect(page.getByRole('button', { name: 'Settings & Status' })).toBeVisible();
            await page.getByRole('button', { name: 'Settings & Status' }).click();
            await page.getByRole('button', { name: /Event work type/ }).click();

            await expect(page.getByRole('option', { name: 'Tutoring' })).toHaveCount(0);
            await page.getByRole('option', { name: 'Work', exact: true }).click();

            await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();
            await page.getByRole('button', { name: 'Save Changes' }).click();

            // Re-open and verify Work Type persisted
            await expect(page.getByRole('button', { name: /Software Lesson/ })).toBeVisible();
            await page.getByRole('button', { name: /Software Lesson/ }).first().click();

            await expect(page.getByRole('button', { name: 'Settings & Status' })).toBeVisible();
            await page.getByRole('button', { name: 'Settings & Status' }).click();

            await expect(page.getByRole('button', { name: /Event work type/ })).toContainText('Work');

            // Change Status → Completed
            await page.getByRole('button', { name: /Event work status/ }).click();

            await expect(page.getByRole('option', { name: 'Completed', exact: true })).toBeVisible();
            await page.getByRole('option', { name: 'Completed', exact: true }).click();

            await expect(page.getByRole('button', {name : 'Save Changes' })).toBeVisible();
            await page.getByRole('button', { name: 'Save Changes' }).click();

            // Re-open and verify Status persisted
            await expect(page.getByRole('button', { name: /Software Lesson/ })).toBeVisible();
            await page.getByRole('button', { name: /Software Lesson/ }).first().click();

            await expect(page.getByRole('button', { name: 'Settings & Status' })).toBeVisible();
            await page.getByRole('button', { name: 'Settings & Status' }).click();
            await expect(page.getByRole('button', { name: /Event work status/ })).toBeVisible();

            // Delete
            await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
            await page.getByRole('button', { name: 'Delete', exact: true }).click();
            const confirmation = page.getByRole('dialog', { name: 'Delete Event', exact: true });
            await expect(confirmation).toContainText('This cannot be undone.');
            await confirmation.getByRole('button', { name: 'Delete', exact: true }).click();
            await expect(page.getByRole('button', { name: /Software Lesson/ })).toBeHidden();
        });
    });

    // ==========================================
    // SUITE 3: Reporting & Analytics
    // ==========================================
    test.describe('Reporting & Analytics', () => {
        test.beforeEach(async ({ page }) => {
            // Create a completed shift so Tutor Hours has data to display
            await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible();
            await page.getByRole('link', { name: 'Calendar' }).click();
            await page.locator('.rbc-events-container').nth(1).click();

            await expect(page.getByRole('textbox', { name: 'Event title' })).toBeVisible();
            await page.getByRole('textbox', { name: 'Event title' }).fill('Reporting Shift');

            await expect(page.getByRole('button', { name: 'Participants' })).toBeVisible();
            await page.getByRole('button', { name: 'Participants' }).click();

            await page.getByRole('button', { name: 'Assign tutors to event', exact: true }).click();

            await expect(page.getByRole('option', { name: /Viraj Patel/i })).toBeVisible();
            await page.getByRole('option', { name: /Viraj Patel/i }).click();

            await expect(page.getByRole('button', { name: 'Add Event' })).toBeVisible();
            await page.getByRole('button', { name: 'Add Event' }).click();

            await expect(page.getByRole('button', { name: /Reporting Shift/ })).toBeVisible();

            await expect(page.getByRole('button', { name: /Reporting Shift/ })).toBeVisible();
            await page.getByRole('button', { name: /Reporting Shift/ }).first().click();

            await expect(page.getByRole('button', { name: 'Settings & Status' })).toBeVisible();
            await page.getByRole('button', { name: 'Settings & Status' }).click();

            await page.getByRole('button', { name: /Event work status/ }).click();

            await expect(page.getByRole('option', { name: 'Completed', exact: true })).toBeVisible();
            await page.getByRole('option', { name: 'Completed', exact: true }).click();

            await expect(page.getByRole('button', {name : 'Save Changes' })).toBeVisible();
            await page.getByRole('button', { name: 'Save Changes' }).click();
        });

        test('should calculate and display correct tutor hours', async ({ page }) => {
            await expect(page.getByRole('link', { name: 'Tutor Hours' })).toBeVisible();
            await page.getByRole('link', { name: 'Tutor Hours' }).click();

            await expect(page.getByRole('cell', { name: 'Viraj Patel' })).toBeVisible();
            await page.getByRole('cell', { name: 'Viraj Patel' }).click();

            await expect(page.getByRole('cell', { name: '0h 30m' }).first()).toBeVisible();
            await expect(page.getByRole('cell', { name: '0h 0m' })).toBeVisible();
        });
    });
});
