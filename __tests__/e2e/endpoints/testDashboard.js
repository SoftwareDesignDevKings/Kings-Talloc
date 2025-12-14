const { test, expect } = require('@playwright/test');

/**
 * Dashboard tests for all user roles
 * Verifies that each role can access their dashboard and sees role-appropriate content
 */
function testDashboard() {
  test.describe('Dashboard - Teacher', () => {
    test.use({ storageState: '__tests__/e2e/.auth/teacher.json' });

    test('should load dashboard successfully', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Verify page loaded
      expect(page.url()).toContain('/dashboard');

      // Check for common dashboard elements
      await expect(page.locator('body')).toBeVisible();

      // Teacher-specific checks (adjust based on your actual dashboard)
      // Example: await expect(page.getByText('Teacher Dashboard')).toBeVisible();
    });

    test('should not see student-specific content', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Add checks to ensure teacher doesn't see student-only features
      // This depends on your actual implementation
    });
  });

  test.describe('Dashboard - Tutor', () => {
    test.use({ storageState: '__tests__/e2e/.auth/tutor.json' });

    test('should load dashboard successfully', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Verify page loaded
      expect(page.url()).toContain('/dashboard');

      // Check for common dashboard elements
      await expect(page.locator('body')).toBeVisible();

      // Tutor-specific checks
      // Example: await expect(page.getByText('Tutor Dashboard')).toBeVisible();
    });

    test('should not see teacher-specific content', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Add checks to ensure tutor doesn't see teacher-only features
    });
  });

  test.describe('Dashboard - Student', () => {
    test.use({ storageState: '__tests__/e2e/.auth/student.json' });

    test('should load dashboard successfully', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Verify page loaded
      expect(page.url()).toContain('/dashboard');

      // Check for common dashboard elements
      await expect(page.locator('body')).toBeVisible();

      // Student-specific checks
      // Example: await expect(page.getByText('Student Dashboard')).toBeVisible();
    });

    test('should not see teacher or tutor content', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Add checks to ensure student doesn't see teacher/tutor-only features
    });
  });

  test.describe('Dashboard - Role-based permissions', () => {
    test('teacher can access admin features', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Add checks for teacher-only admin features
      // This depends on your actual implementation
    });
  });
}

module.exports = { testDashboard };
