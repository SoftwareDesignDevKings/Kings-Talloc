const { defineConfig, devices } = require('@playwright/test');
const path = require('node:path');
const shellQuote = value => "'" + value.replace(/'/g, "'\\''") + "'";

if (!process.env.COMPARISON_MANIFEST) throw new Error('Run npm run test:regression-comparison -- <baseline commit> to prepare isolated apps.');
const manifest = require(process.env.COMPARISON_MANIFEST);
const variant = process.env.COMPARISON_VARIANT;
if (!['prod', 'pr'].includes(variant)) throw new Error('Select prod or pr explicitly.');
const port = manifest.ports[variant];
const projectId = manifest.projects[variant];
if (!projectId.startsWith('demo-talloc-compare-')) throw new Error('Comparison must use a synthetic Firebase project.');

module.exports = defineConfig({
    testDir: './tests/regression', testMatch: 'comparison.spec.cjs', workers: 1, timeout: 120000,
    expect: { timeout: 20000 },
    outputDir: path.join(manifest.output, variant, 'traces'),
    reporter: [['list'], ['json', { outputFile: path.join(manifest.output, variant, 'playwright.json') }]],
    use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${port}`, timezoneId: 'Australia/Sydney', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
    webServer: {
        command: `${shellQuote(process.execPath)} node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port ${port}`,
        cwd: manifest.apps[variant], url: `http://localhost:${port}/login`, reuseExistingServer: false, timeout: 180000,
        env: {
            NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId, NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-comparison-key',
            NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`, NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: `${projectId}.appspot.com`,
            NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:comparison', NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
            NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: manifest.firestoreHosts[variant], NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: manifest.authHosts[variant],
            NEXTAUTH_URL: `http://localhost:${port}`, NEXTAUTH_SECRET: 'isolated-regression-comparison-only',
        },
    },
});
