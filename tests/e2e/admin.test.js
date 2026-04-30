import { test, expect } from '@playwright/test';

test.describe('Admin Workflow @admin', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000/dashboard');
    });

    // ==========================================
    // SUITE 1: System Setup (Subjects & Classes)
    // ==========================================
    test.describe('System Setup', () => {
        test('should manage subjects and allocate tutors', async ({ page }) => {
            await page.click(`button:has-text("Manage Subjects")`);

            // Add Subject
            await page.getByRole('button', { name: 'Add Subject' }).click();
            await page.getByRole('dialog').getByRole('textbox').fill('Software Engineering');
            await page.getByRole('dialog').getByRole('button', { name: 'Add Subject' }).click();
            await expect(
                page.getByRole('cell', { name: 'Software Engineering' }).first(),
            ).toBeVisible();

            // Add & Remove Tutors
            await page.getByRole('button', { name: 'Expand to view tutors' }).click();
            await page.getByRole('button', { name: 'Add Tutors' }).click();
            await page.getByRole('textbox', { name: 'Enter emails' }).fill('tutor@kings.edu.au');
            await page.getByRole('dialog').getByRole('button', { name: 'Add Tutors' }).click();

            // Verify addition and then test removal
            await expect(page.getByText('Tutors (1)')).toBeVisible();
            await page.getByRole('button', { name: 'Remove' }).first().click();
            await expect(page.getByText('No tutors added to this')).toBeVisible();
        });

        test('should manage classes and student enrollment', async ({ page }) => {
            await expect(page.getByRole('link', { name: 'Manage Classes' })).toBeVisible();
            await page.getByRole('link', { name: 'Manage Classes' }).click();

            // Add Class (Handling react-select dropdowns safely)
            await page.getByRole('button', { name: 'Add Class' }).click();
            await page.getByRole('dialog').getByRole('textbox').fill('Software');

            // Select Subject
            await page.locator('.select__input-container').first().click();
            await page.getByRole('option', { name: 'Software Engineering' }).click();

            // Select Teacher
            await page.locator('.select__input-container').nth(1).click();
            await page.getByRole('option', { name: 'Michael Ienna' }).click();
            await page.getByRole('dialog').getByRole('button', { name: 'Add Class' }).click();

            // Add Student
            await page.getByRole('button', { name: 'Expand to view students' }).click();
            await page.getByRole('button', { name: 'Add Students' }).click();
            await page.getByRole('textbox', { name: 'Enter emails' }).fill('student@kings.edu.au');
            await page.getByRole('dialog').getByRole('button', { name: 'Add Students' }).click();

            await expect(page.getByText('student@kings.edu.au')).toBeVisible();
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
            // Intercept MS Teams API call
            await page.route('**/api/microsoft/**', async (route) => {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        joinUrl: 'https://teams.microsoft.com/l/meetup-join/mock',
                    }),
                });
            });

            // Open creation modal (Targeting the calendar grid safely)
            await page.locator('.rbc-events-container').first().click();
            await page.getByRole('textbox', { name: 'Event title' }).fill('Software');

            // Add Teams & Participants
            await page.getByRole('button', { name: 'Add online Teams meeting' }).click();
            await page.getByRole('button', { name: 'Participants' }).click();

            // Select Tutor
            await page.locator('.select__input-container').first().click();
            await page.getByRole('option', { name: /Viraj Patel/i }).click();

            await page.getByRole('button', { name: 'Add Event' }).click();
            await expect(page.getByText('Teams meeting created')).toBeVisible();

            // Verify the link is attached to the event
            await page.getByRole('button', { name: /Software \(VP\)/ }).click();
            await expect(page.getByRole('link', { name: /Join Now/i })).toBeVisible();
            await expect(page.getByRole('link', { name: /Join Now/i })).toHaveAttribute(
                'href',
                'https://teams.microsoft.com/l/meetup-join/mock',
            );
        });

        test('should edit workTypes, statuses, and delete events', async ({ page }) => {
            await page
                .getByRole('button', { name: /Software \(VP\)/ })
                .first()
                .click();
            await page.getByRole('button', { name: 'Settings & Status' }).click();

            // Change Work Type
            await page.locator('.select__input-container').first().click();
            await page.getByRole('option', { name: 'Tutoring' }).click();

            // Change Status
            await page.locator('.select__input-container').nth(1).click();
            await page.getByRole('option', { name: 'Completed' }).click();

            await page.getByRole('button', { name: 'Save Changes' }).click();
            await expect(page.getByText('Teams meeting updated')).toBeVisible();

            // Deletion
            await page
                .getByRole('button', { name: /Software \(VP\)/ })
                .first()
                .click();
            await page.getByRole('button', { name: 'Delete' }).click();
            await expect(page.getByRole('button', { name: /Software \(VP\)/ })).toBeHidden();
        });

        test('should create and verify recurring shifts', async ({ page }) => {
            await page.locator('.rbc-events-container').first().click();
            await page.getByRole('textbox', { name: 'Event title' }).fill('Weekly Sync');

            await page.getByLabel(/recurring/i).check();
            await page.getByLabel('Repeat Every').fill('1');
            await page.getByRole('button', { name: 'Add Event' }).click();

            // Verify current week
            await expect(page.getByRole('button', { name: /Weekly Sync/ })).toBeVisible();

            // Navigate to next week and verify
            await page.getByRole('button', { name: 'Next', exact: true }).click();
            await expect(page.getByRole('button', { name: /Weekly Sync/ })).toBeVisible();
        });
    });

    // ==========================================
    // SUITE 3: Reporting & Analytics
    // ==========================================
    test.describe('Reporting', () => {
        test('should calculate and display correct tutor hours', async ({ page }) => {
            await expect(page.getByRole('link', { name: 'Tutor Hours' })).toBeVisible();
            await page.getByRole('link', { name: 'Tutor Hours' }).click();

            // Verify Tutor is listed
            await expect(page.getByRole('cell', { name: 'Viraj Patel' })).toBeVisible();

            // Click to view breakdown
            await page.getByRole('cell', { name: 'Viraj Patel' }).click();

            await expect(page.getByRole('cell', { name: '0.50' }).first()).toBeVisible();
            await expect(page.getByRole('cell', { name: '0.00' })).toBeVisible();
        });
    });
});
