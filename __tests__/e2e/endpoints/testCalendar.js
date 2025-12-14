const { test, expect } = require('@playwright/test');
const { clearFirestore } = require('../helpers/clearFirestore');

/**
 * Calendar tests - End-to-end event creation and visibility
 * Tests the full flow: Teacher creates event → Student and Tutor see it
 */
function testCalendar() {
  test.describe('Calendar - Basic Access', () => {
    test('teacher can access calendar', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: '__tests__/e2e/.auth/teacher.json',
      });
      const page = await context.newPage();

      await page.goto('/calendar');
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain('/calendar');
      await expect(page.locator('body')).toBeVisible();

      await context.close();
    });

    test('tutor can access calendar', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: '__tests__/e2e/.auth/tutor.json',
      });
      const page = await context.newPage();

      await page.goto('/calendar');
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain('/calendar');
      await expect(page.locator('body')).toBeVisible();

      await context.close();
    });

    test('student can access calendar', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: '__tests__/e2e/.auth/student.json',
      });
      const page = await context.newPage();

      await page.goto('/calendar');
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain('/calendar');
      await expect(page.locator('body')).toBeVisible();

      await context.close();
    });
  });

  test.describe('Calendar - Event Creation and Visibility', () => {
    test.beforeEach(async () => {
      // Clear Firestore before each test to ensure clean state
      await clearFirestore();
    });

    test('teacher creates event, student and tutor see it', async ({ browser }) => {
      // Step 1: Teacher creates an event
      const teacherContext = await browser.newContext({
        storageState: '__tests__/e2e/.auth/teacher.json',
      });
      const teacherPage = await teacherContext.newPage();

      await teacherPage.goto('/calendar');
      await teacherPage.waitForLoadState('networkidle');

      // TODO: Replace with your actual event creation flow
      // This is a placeholder - adjust selectors based on your UI

      // Example event creation flow (adjust to match your app):
      // 1. Click "Create Event" button
      // const createButton = teacherPage.getByRole('button', { name: /create event/i });
      // if (await createButton.isVisible()) {
      //   await createButton.click();
      //
      //   // 2. Fill in event details
      //   await teacherPage.fill('[name="title"]', 'E2E Test Event');
      //   await teacherPage.fill('[name="description"]', 'This is a test event');
      //
      //   // 3. Submit form
      //   await teacherPage.click('[type="submit"]');
      //
      //   // 4. Wait for event to be saved
      //   await teacherPage.waitForTimeout(1000);
      // }

      await teacherContext.close();

      // Step 2: Student verifies they can see the event
      const studentContext = await browser.newContext({
        storageState: '__tests__/e2e/.auth/student.json',
      });
      const studentPage = await studentContext.newPage();

      await studentPage.goto('/calendar');
      await studentPage.waitForLoadState('networkidle');

      // TODO: Verify event is visible in student's calendar
      // Example:
      // await expect(studentPage.getByText('E2E Test Event')).toBeVisible();

      await studentContext.close();

      // Step 3: Tutor verifies they can see the event
      const tutorContext = await browser.newContext({
        storageState: '__tests__/e2e/.auth/tutor.json',
      });
      const tutorPage = await tutorContext.newPage();

      await tutorPage.goto('/calendar');
      await tutorPage.waitForLoadState('networkidle');

      // TODO: Verify event is visible in tutor's calendar
      // Example:
      // await expect(tutorPage.getByText('E2E Test Event')).toBeVisible();

      await tutorContext.close();
    });

    test('events are role-specific when applicable', async ({ browser }) => {
      // Test that role-based event filtering works
      // This depends on your app's specific requirements
    });
  });

  test.describe('Calendar - Event Operations', () => {
    test.beforeEach(async () => {
      await clearFirestore();
    });

    test('teacher can edit events', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: '__tests__/e2e/.auth/teacher.json',
      });
      const page = await context.newPage();

      await page.goto('/calendar');
      await page.waitForLoadState('networkidle');

      // TODO: Implement event editing test

      await context.close();
    });

    test('teacher can delete events', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: '__tests__/e2e/.auth/teacher.json',
      });
      const page = await context.newPage();

      await page.goto('/calendar');
      await page.waitForLoadState('networkidle');

      // TODO: Implement event deletion test

      await context.close();
    });

    test('students cannot edit events', async ({ browser }) => {
      const context = await browser.newContext({
        storageState: '__tests__/e2e/.auth/student.json',
      });
      const page = await context.newPage();

      await page.goto('/calendar');
      await page.waitForLoadState('networkidle');

      // TODO: Verify students don't see edit/delete buttons

      await context.close();
    });
  });
}

module.exports = { testCalendar };
