import { test as setup, expect} from '@playwright/test';
import { TEST_USERS } from '@/lib/security/testUsers';
import fs from 'fs';

const TEAL = '\x1b[36m';
const RESET = '\x1b[0m';

// Force development mode for tests
process.env.NODE_ENV = 'development';

setup('authenticate users', async ({ browser }) => {
    setup.setTimeout(120000);
    if (!fs.existsSync('tests/e2e/.auth')) {
        fs.mkdirSync('tests/e2e/.auth', { recursive: true });
    }

    for (const emailKey in TEST_USERS) {
        
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
            
            await page.goto('/login');
        
            let buttonLabel, userRoleForLabel;
            if (emailKey === 'computing@kings.edu.au') {
                buttonLabel = 'Teacher + Admin';
                userRoleForLabel = 'teacherAdmin';
            } else if (emailKey === 'tutor@kings.edu.au') {
                buttonLabel = 'Tutor';
                userRoleForLabel = 'tutor';
            } else if (emailKey === 'tutorAdmin@kings.edu.au') {
                buttonLabel = 'Tutor + Admin';
                userRoleForLabel = 'tutorAdmin';
            } else if (emailKey === 'teacher@kings.edu.au') {
                buttonLabel = 'Teacher';
                userRoleForLabel = 'teacher';
            } else if (emailKey === 'coach@kings.edu.au') {
                buttonLabel = 'Coach';
                userRoleForLabel = 'coach';
            } else if (emailKey === 'coachTutor@kings.edu.au') {
                buttonLabel = 'Coach + Tutor';
                userRoleForLabel = 'coachTutor';
            } else if (emailKey === 'student@kings.edu.au') {
                buttonLabel = 'Student';
                userRoleForLabel = 'student';
            }
            
            // click the dev button
            const devButton = page.getByRole('button', { name: buttonLabel, exact: true });
            await expect(devButton).toBeVisible();
            await devButton.click();
            
            // wait for either dashboard OR check for error
            try {
                await page.waitForURL('/dashboard', { timeout: 10000 });
            } catch {
                // If no dashboard, check if we're still on login with error
                const errorMsg = await page.locator('.alert-danger').textContent().catch(() => null);
                if (errorMsg) {
                    throw new Error(`Login failed: ${errorMsg}`);
                }
                throw new Error('Never reached dashboard');
            }

            await context.storageState({
                path: `tests/e2e/.auth/${userRoleForLabel}.json`
            });

            console.log(`${TEAL} Authenticated ${userRoleForLabel}${RESET}`);
        } catch (error) {
            console.error(`Failed to authenticate ${userRoleForLabel}:`, error);
            await page.screenshot({ path: `tests/e2e/.auth/failed-${userRoleForLabel}.png` }).catch(() => {});
        } finally {
            await context.close().catch(() => {});
        }
    }
});