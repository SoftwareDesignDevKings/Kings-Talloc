import { test, expect } from '@playwright/test';

test.describe('Admin Workflow @teacherAdmin', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/dashboard');
    });

    // ==========================================
    // SUITE 1: System Setup (Subjects & Classes)
    // ==========================================
    test.describe('System Setup', () => {
        test('should manage subjects and allocate tutors', async ({ page }) => {
            await expect(page.getByRole('link', { name: 'Manage Subjects' })).toBeVisible();
            await page.getByRole('link', { name: 'Manage Subjects' }).click();

            // Add Subject
            await expect(page.getByRole('button', { name: 'Add Subject' })).toBeVisible();
            await page.getByRole('button', { name: 'Add Subject' }).click();

            await expect(page.getByRole('dialog').getByRole('textbox')).toBeVisible();
            await page.getByRole('dialog').getByRole('textbox').fill('Software Engineering');

            await expect(page.getByRole('dialog').getByRole('button', { name: 'Add Subject' })).toBeVisible();
            await page.getByRole('dialog').getByRole('button', { name: 'Add Subject' }).click();

            await expect(page.getByRole('dialog')).toBeHidden();
            await expect(
                page.getByRole('cell', { name: 'Software Engineering' })
            ).toBeVisible();

            // Add & Remove Tutors
            await expect(page.getByRole('button', { name: 'Expand to view tutors' })).toBeVisible();
            await page.getByRole('button', { name: 'Expand to view tutors' }).click();

            await expect(page.getByRole('button', { name: 'Add Tutors' })).toBeVisible();
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

            await expect(page.getByRole('button', { name: 'Add Class' })).toBeVisible();
            await page.getByRole('button', { name: 'Add Class' }).click();

            await page.getByRole('dialog').getByRole('textbox').fill('Software');

            // Select Subject
            await page.locator('.select__input-container').first().click();
            await expect(page.getByRole('option', { name: 'Software Engineering' }).first()).toBeVisible();
            await page.getByRole('option', { name: 'Software Engineering' }).first().click();

            // Select Teacher
            await page.locator('.select__input-container').nth(1).click();

            await expect(page.getByRole('option', { name: 'Michael Ienna' }).first()).toBeVisible();
            await page.getByRole('option', { name: 'Michael Ienna' }).first().click();

            await page.getByRole('dialog').getByRole('button', { name: 'Add Class' }).click();

            await expect(page.getByRole('dialog')).toBeHidden();

            // Add Student
            await expect(page.getByRole('button', { name: 'Expand to view students' })).toBeVisible();
            await page.getByRole('button', { name: 'Expand to view students' }).click();

            await expect(page.getByRole('button', { name: 'Add Students' })).toBeVisible();
            await page.getByRole('button', { name: 'Add Students' }).click();
            
            await expect(page.getByRole('textbox', { name: 'Enter emails' })).toBeVisible();
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

            await page.locator('.rbc-events-container').first().click();
            await page.getByRole('textbox', { name: 'Event title' }).fill('Software');

            await page.getByRole('button', { name: 'Participants' }).click();
            await page.locator('.mb-4 > .css-b62m3t-container > .select__control > .select__value-container > .select__input-container').click();
            await page.getByRole('option', { name: /Viraj Patel/i }).click();

            await page.getByRole('button', { name: 'General Information' }).click();
            await page.getByRole('button', { name: 'Add online Teams meeting' }).click();

            await page.getByRole('button', { name: 'Add Event' }).click();
            await expect(page.getByText('Teams meeting created')).toBeVisible();

            await page.getByRole('button', { name: /Software \(VP\)/ }).click();
            await expect(page.getByRole('link', { name: /Join Now/i })).toBeVisible();
            await expect(page.getByRole('link', { name: /Join Now/i })).toHaveAttribute(
                'href',
                'https://teams.microsoft.com/l/meetup-join/dev-mock-meeting',
            );
        });

        test('should edit workTypes, statuses, and delete events', async ({ page }) => {


            // Create a fresh event (DB was cleared by beforeEach)
            await page.locator('.rbc-events-container').nth(1).click();
            await page.getByRole('textbox', { name: 'Event title' }).fill('Software Lesson');
            await page.getByRole('button', { name: 'Participants' }).click();
            await page.locator('.mb-4 > .css-b62m3t-container > .select__control > .select__value-container > .select__input-container').click();

            await page.getByRole('option', { name: /Viraj Patel/i }).click();
            await page.getByRole('button', { name: 'Add Event' }).click();
            await expect(page.getByRole('button', { name: /Software Lesson/ })).toBeVisible();

            // Change Work Type → Tutoring
            await page.getByRole('button', { name: /Software Lesson/ }).first().click();
            await page.getByRole('button', { name: 'Settings & Status' }).click();
            await page.locator('div').filter({ hasText: /^Work$/ }).nth(1).click();
            await page.getByRole('option', { name: 'Tutoring' }).click();
            await page.getByRole('button', { name: 'Save Changes' }).click();

            // Re-open and verify Work Type persisted
            await page.getByRole('button', { name: /Software Lesson/ }).first().click();
            await page.getByRole('button', { name: 'Settings & Status' }).click();
            await expect(page.getByText('Work TypeTutoring')).toBeVisible();

            // Change Status → Completed
            await page.locator('div').filter({ hasText: /^Not Completed$/ }).nth(1).click();
            await page.getByRole('option', { name: 'Completed', exact: true }).click();
            await page.getByRole('button', { name: 'Save Changes' }).click();

            // Re-open and verify Status persisted
            await page.getByRole('button', { name: /Software Lesson/ }).first().click();
            await page.getByRole('button', { name: 'Settings & Status' }).click();
            await expect(page.locator('div').filter({ hasText: /^Completed$/ }).nth(1)).toBeVisible();

            // Delete
            await page.getByRole('button', { name: 'Delete' }).click();
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
            await page.getByRole('textbox', { name: 'Event title' }).fill('Reporting Shift');
            await page.getByRole('button', { name: 'Participants' }).click();
            await page.locator('.mb-4 > .css-b62m3t-container > .select__control > .select__value-container > .select__input-container').click();
            await page.getByRole('option', { name: /Viraj Patel/i }).click();
            await page.getByRole('button', { name: 'Add Event' }).click();
            await expect(page.getByRole('button', { name: /Reporting Shift/ })).toBeVisible();

            await page.getByRole('button', { name: /Reporting Shift/ }).first().click();
            await page.getByRole('button', { name: 'Settings & Status' }).click();
            await page.locator('div').filter({ hasText: /^Not Completed$/ }).nth(1).click();
            await page.getByRole('option', { name: 'Completed', exact: true }).click();
            await page.getByRole('button', { name: 'Save Changes' }).click();
        });

        test('should calculate and display correct tutor hours', async ({ page }) => {
            await expect(page.getByRole('link', { name: 'Tutor Hours' })).toBeVisible();
            await page.getByRole('link', { name: 'Tutor Hours' }).click();

            await expect(page.getByRole('cell', { name: 'Viraj Patel' })).toBeVisible();
            await page.getByRole('cell', { name: 'Viraj Patel' }).click();

            await expect(page.getByRole('cell', { name: '0.50' }).first()).toBeVisible();
            await expect(page.getByRole('cell', { name: '0.00' })).toBeVisible();
        });
    });
});