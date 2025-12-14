import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load E2E environment variables (quietly)
dotenv.config({ path: path.resolve(__dirname, '.env.e2e'), quiet: true });

export default defineConfig({
  testDir: './__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'], // Prints each test name and result
    ['html', { open: 'never' }]
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    // Setup project that runs authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
    },

    // Teacher tests
    {
      name: 'teacher',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '__tests__/e2e/.auth/teacher.json',
      },
      dependencies: ['setup'],
    },

    // Tutor tests
    {
      name: 'tutor',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '__tests__/e2e/.auth/tutor.json',
      },
      dependencies: ['setup'],
    },

    // Student tests
    {
      name: 'student',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '__tests__/e2e/.auth/student.json',
      },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'node scripts/dev-e2e.js',
    url: 'http://localhost:3000',
    timeout: 120000, // 2 minutes for server to start
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore', // Suppress server logs
    stderr: 'ignore', // Suppress server errors
  },
});
