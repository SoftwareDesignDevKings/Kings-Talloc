import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
    testDir: './tests/e2e', testMatch: 'work-bookings-hours.test.js', workers: 1, timeout: 60000,
    expect: { timeout: 15000 },
    use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3100', timezoneId: 'Australia/Sydney', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
    webServer: { command: 'npm run dev -- --port 3100', url: 'http://localhost:3100', reuseExistingServer: !process.env.CI, timeout: 120000, env: { NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-talloc-work-hours', NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-work-hours-api-key', NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'demo-talloc-work-hours.firebaseapp.com', NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo-talloc-work-hours.appspot.com', NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:workhours', NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789', NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: '127.0.0.1:8180', NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9199', NEXTAUTH_URL: 'http://localhost:3100', NEXTAUTH_SECRET: 'local-isolated-work-hours-verification-only' } },
});
