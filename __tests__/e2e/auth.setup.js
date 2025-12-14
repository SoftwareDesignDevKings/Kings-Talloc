const { test: setup, expect } = require('@playwright/test');
const { clearFirestore } = require('./helpers/clearFirestore');

const ROLES = ['teacher', 'tutor', 'student'];
let firestoreCleared = false;

/**
 * Authentication setup for E2E tests
 * Creates three test users (teacher, tutor, student) and saves their authentication states
 */
for (const role of ROLES) {
  setup(`authenticate as ${role}`, async ({ page, request }) => {
    // Clear Firestore only once (before the first auth)
    if (!firestoreCleared) {
      await clearFirestore();
      firestoreCleared = true;
    }

    const email = `${role}@example.test`;
    const password = process.env.E2E_TEST_PASSWORD || 'test123';

    // Retry login with exponential backoff (dev server might still be warming up)
    let response;
    let data;
    let lastError;

    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        // Call the E2E login endpoint
        response = await request.post('http://localhost:3000/api/e2e-login', {
          data: {
            email,
            password,
            role,
          },
        });

        // If successful, break out of retry loop
        if (response.ok()) {
          data = await response.json();
          break;
        }

        // Log non-OK response
        const errorText = await response.text();
        lastError = `Status ${response.status()}: ${errorText}`;

        // Wait before retrying (exponential backoff)
        if (attempt < 5) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      } catch (error) {
        lastError = error.message;

        // Wait before retrying
        if (attempt < 5) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // Check if we got a successful response
    if (!response || !response.ok()) {
      throw new Error(`E2E login failed for ${role}: ${lastError}`);
    }

    expect(data.success).toBe(true);

    // Set NextAuth session cookie
    const context = page.context();
    await context.addCookies([
      {
        name: 'next-auth.session-token',
        value: data.token,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        expires: Date.now() / 1000 + 3600, // 1 hour
      },
    ]);

    // Navigate to dashboard to verify authentication
    await page.goto('http://localhost:3000/dashboard');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Save signed-in state
    await page.context().storageState({ path: `__tests__/e2e/.auth/${role}.json` });
  });
}
