import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 2 : 0,

    use: {
        baseURL: 'http://localhost:3000',
        headless: true,
        actionTimeout: 15000,
        navigationTimeout: 30000
    },

    projects: [
        {
            name: 'setup',
            testMatch: /auth\.setup\.js/, 
        },

        {
            name: 'admin-tests',
            grep: /@admin/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'tests/e2e/.auth/admin.json'
            },
            dependencies: ['setup']
        }
    ],

    webServer: {
        command: 'npm run dev',
        port: 3000,
        reuseExistingServer: !process.env.CI,
        timeout: 120000
    }
})