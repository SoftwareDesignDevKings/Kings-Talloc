import { test as setup, expect} from '@playwright/test';
import { TEST_USERS } from '@/lib/security/testUsers';
import fs from 'fs';

const TEAL = '\x1b[36m';
const RESET = '\x1b[0m';

// Force development mode for tests
process.env.NODE_ENV = 'development';

setup('authenticate users', async ({ browser }) => {
    if (!fs.existsSync('tests/e2e/.auth')) {
        fs.mkdirSync('tests/e2e/.auth', { recursive: true });
    }

    for (const emailKey in TEST_USERS) {
        const user = TEST_USERS[emailKey]; 
        
        const context = await browser.newContext();
        const page = await context.newPage();
        
        try {
            console.log(`${TEAL}Authenticating ${user.role}...${RESET}`);
            
            await page.goto('/login');
        
            let buttonLabel;
            if (emailKey === 'computing@kings.edu.au') {
                buttonLabel = 'Teacher + Admin';
            } else if (emailKey === 'tutor@kings.edu.au') {
                buttonLabel = 'Tutor';
            } else if (emailKey === 'tutorAdmin@kings.edu.au') {
                buttonLabel = 'Tutor + Admin';
            } else if (emailKey === 'teacher@kings.edu.au') {
                buttonLabel = 'Teacher';
            } else if (emailKey === 'coach@kings.edu.au') {
                buttonLabel = 'Coach';
            } else if (emailKey === 'coachTutor@kings.edu.au') {
                buttonLabel = 'Coach + Tutor';
            } else if (emailKey === 'student@kings.edu.au') {
                buttonLabel = 'Student';
            }
            
            // click the dev button
            await expect(page.getByRole('button', { name: buttonLabel })).toBeVisible();
            await page.click(`button:has-text("${buttonLabel}")`);
            
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
                path: `tests/e2e/.auth/${user.role}.json`
            });

            console.log(`${TEAL} Authenticated ${user.role}${RESET}`);
        } catch (error) {
            console.error(`Failed to authenticate ${user.role}:`, error);
            await page.screenshot({ path: `tests/e2e/.auth/failed-${user.role}.png` });
        } finally {
            await context.close();
        }
    }
});