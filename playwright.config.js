import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: './tests/e2e',

    use: {
        baseURL: 'http://localhost:3000',
        headless: true
    },

    webServer: {
        command: 'npm run dev',
        port: 3000
    }
})