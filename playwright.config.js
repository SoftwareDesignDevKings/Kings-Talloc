import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    workers: 1,
    // CI splits the suite across parallel jobs, e.g. PLAYWRIGHT_SHARD=2/4.
    shard: process.env.PLAYWRIGHT_SHARD
        ? { current: Number(process.env.PLAYWRIGHT_SHARD.split('/')[0]), total: Number(process.env.PLAYWRIGHT_SHARD.split('/')[1]) }
        : null,
    retries: process.env.CI ? 3 : 0,

    expect: {
        timeout: 15000
    },

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
            grep: /@teacherAdmin/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'tests/e2e/.auth/teacherAdmin.json'
            },
            dependencies: ['setup']
        },
        {
            name: 'teacher-tests',
            grep: /@teacherOnly/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'tests/e2e/.auth/teacher.json'
            },
            dependencies: ['setup']
        },
        {
            name: 'tutor-tests',
            grep: /@tutorOnly/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'tests/e2e/.auth/tutor.json'
            },
            dependencies: ['setup']
        },
        {
            name: 'coach-tests',
            grep: /@coachOnly/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'tests/e2e/.auth/coach.json'
            },
            dependencies: ['setup']
        },
        {
            name: 'student-tests',
            grep: /@studentOnly/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'tests/e2e/.auth/student.json'
            },
            dependencies: ['setup']
        },
        {
            name: 'coachTutor-tests',
            grep: /@coachTutor/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'tests/e2e/.auth/coachTutor.json'
            },
            dependencies: ['setup']
        },
        {
            name: 'tutorAdmin-tests',
            grep: /@tutorAdmin/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'tests/e2e/.auth/tutorAdmin.json'
            },
            dependencies: ['setup']
        }
    ],

    webServer: {
        command: 'npm run dev',
        port: 3000,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
        // Tests seed the emulator and assert at once; server caching would serve stale data.
        env: { TALLOC_DISABLE_CACHE: '1' },
    }
})
