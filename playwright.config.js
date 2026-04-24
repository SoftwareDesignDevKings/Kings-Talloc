import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './tests/e2e',

    fullyParallel: true,

    use: {
        baseURL: 'http://localhost:3000',
        headless: true
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
        command: 'npm run dev:emulator',
        port: 3000,
        reuseExistingServer: !process.env.CI,
        timeout: 120000
    }
})