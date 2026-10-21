import { fillEventDateTime } from './dateTimePickerHelpers';
import { test, expect } from '@playwright/test';
import { clearFirestoreEmulator, seedStudentRequestInEmulator, seedUserInEmulator, seedStudentEligibilityInEmulator, confirmAction } from './wrapperFunctions';

// Real tab/window focus is part of this suite; headless Chromium can keep background tabs active.
test.use({ storageState: 'tests/e2e/.auth/notificationAdmin.json', channel: 'chromium', headless: false });

const request = (title, daysAhead, overrides = {}) => {
    const start = new Date(Date.now() + daysAhead * 86400000);
    return {
        title, start, end: new Date(start.getTime() + 3600000), createdAt: new Date(),
        approvalStatus: 'pending', createdByStudent: true, isStudentRequest: true,
        staff: [{ value: 'tutor@kings.edu.au', label: 'Tutor' }], students: [{ value: 'student@kings.edu.au', label: 'Student' }],
        staffEmails: ['tutor@kings.edu.au'], studentEmails: ['student@kings.edu.au'],
        emailsList: ['tutor@kings.edu.au', 'student@kings.edu.au'], classes: [], ...overrides,
    };
};

test.describe('Request notifications @teacherAdmin', () => {
    test.beforeEach(async () => { await clearFirestoreEmulator(); await seedUserInEmulator('tutor@kings.edu.au', { email: 'tutor@kings.edu.au', name: 'Tutor', defaultRole: 'tutor', userRoles: [] }); await seedStudentEligibilityInEmulator('student@kings.edu.au', ['tutor@kings.edu.au']); });

    test('the complete queue uses the existing card and no pages show extra header text', async ({ page }) => {
        await seedStudentRequestInEmulator('later', request('A session in four weeks', 28));
        await seedStudentRequestInEmulator('near', request('A session tomorrow', 1));
        await seedStudentRequestInEmulator('past', request('Missed session', -1));
        await page.goto('/dashboard');
        await expect(page.getByRole('link', { name: /requests? awaiting approval/ })).toHaveCount(0);
        await page.getByRole('button', { name: 'Pending approvals 2', exact: true }).click();
        const dropdown = page.getByRole('dialog', { name: 'Pending approvals', exact: true }).getByRole('list');
        await expect(dropdown.getByText('A session tomorrow', { exact: true })).toBeVisible();
        await expect(dropdown.getByRole('listitem').first()).toContainText('A session tomorrow');
        await expect(dropdown.getByText('A session in four weeks', { exact: true })).toBeVisible();
        await expect(dropdown.getByText('Missed session', { exact: true })).toHaveCount(0);
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog', { name: 'Pending approvals', exact: true })).toHaveCount(0);
        await page.getByRole('link', { name: 'Calendar', exact: true }).click();
        await expect(page).toHaveURL(/\/calendar/);
        await expect(page.getByRole('link', { name: /requests? awaiting approval/ })).toHaveCount(0);
        await page.getByRole('link', { name: 'Manage users', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Manage users', exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: /requests? awaiting approval/ })).toHaveCount(0);
        await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
        await expect(page).toHaveURL(/\/dashboard/);
        await page.getByRole('button', { name: 'Pending approvals 2', exact: true }).click();
        await expect(dropdown).toBeVisible();
        await confirmAction(page, /Reject this request\?/, () => dropdown.getByRole('listitem').first().getByRole('button', { name: 'Reject', exact: true }).click());
        await expect(page.getByRole('button', { name: 'Pending approvals 1', exact: true })).toBeVisible();
        const meetingResponse = page.waitForResponse(response => response.url().includes('/api/microsoft') && response.request().method() === 'POST');
        await dropdown.getByRole('button', { name: 'Approve', exact: true }).click();
        await expect(page.getByText('Request approved successfully', { exact: true })).toBeVisible();
        await expect(page.getByRole('link', { name: /requests? awaiting approval/ })).toHaveCount(0);
        await expect(page.getByText('No pending approvals', { exact: true })).toBeVisible();
        expect((await meetingResponse).status()).toBe(200);
    });

    test('new title counts persist on refresh and acknowledge across tabs without resolving requests', async ({ page, context }) => {
        await seedStudentRequestInEmulator('old-a', request('Old A', 2));
        await seedStudentRequestInEmulator('old-b', request('Old B', 28));
        await page.goto('/dashboard');
        await expect(page.getByRole('button', { name: 'Pending approvals 2', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'View as Teacher', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Teacher dashboard', exact: true })).toBeVisible();
        const second = await context.newPage();
        await second.goto('/calendar');
        await expect(second.getByRole('heading', { name: 'Admin dashboard', exact: true })).toBeVisible();
        await expect(second.getByRole('link', { name: /requests? awaiting approval/ })).toHaveCount(0);
        const away = await context.newPage();
        await away.goto('about:blank');
        // Disable Playwright's forced focus after creating every target, including the away tab.
        for (const tab of [page, second, away]) {
            const session = await context.newCDPSession(tab);
            await session.send('Emulation.setFocusEmulationEnabled', { enabled: false });
        }
        await away.bringToFront();
        await expect.poll(() => page.evaluate(() => document.visibilityState === 'visible' && document.hasFocus())).toBe(false);
        for (let i = 0; i < 3; i++) await seedStudentRequestInEmulator(`new-${i}`, request(`New ${i}`, 3 + i));
        await expect(page).toHaveTitle('(3) Kings-Talloc');
        await expect(second).toHaveTitle('(3) Kings-Talloc');
        await page.reload();
        await expect(page).toHaveTitle('(3) Kings-Talloc');
        await second.bringToFront();
        await expect(second).toHaveTitle('Kings-Talloc');
        await expect(page).toHaveTitle('Kings-Talloc');
        await second.getByRole('link', { name: 'Dashboard', exact: true }).click();
        await expect(second.getByRole('button', { name: 'Pending approvals 5', exact: true })).toBeVisible();
        await away.close();
        await second.close();
    });

    test('teacher notification settings default correctly, save, and update teachers using admin view immediately', async ({ page, browser }) => {
        await seedUserInEmulator('mienna@kings.edu.au', { email: 'mienna@kings.edu.au', name: 'Michael Ienna', defaultRole: 'teacher', userRoles: ['admin'] });
        await seedUserInEmulator('computing@kings.edu.au', { email: 'computing@kings.edu.au', name: 'Demo Other Admin', defaultRole: 'teacher', userRoles: ['admin'] });
        await page.goto('/userRoles');
        await page.getByRole('row').filter({ hasText: 'mienna@kings.edu.au' }).getByRole('button', { name: 'Edit user', exact: true }).click();
        const setting = page.getByRole('switch', { name: 'Tutoring request notifications', exact: true });
        await expect(setting).toBeChecked();
        await page.getByRole('button', { name: 'Cancel', exact: true }).click();

        const otherContext = await browser.newContext({ storageState: 'tests/e2e/.auth/teacherAdmin.json' });
        try {
            const otherPage = await otherContext.newPage();
            await otherPage.goto('/dashboard');
            await expect(otherPage.getByRole('button', { name: 'Pending approvals 0', exact: true })).toBeVisible();
            const otherSession = await otherContext.newCDPSession(otherPage);
            await otherSession.send('Emulation.setFocusEmulationEnabled', { enabled: false });
            const away = await otherContext.newPage();
            await away.goto('about:blank');
            await away.bringToFront();
            await seedStudentRequestInEmulator('before-opt-in', request('Existing before opt-in', 2));
            await expect(otherPage.getByRole('button', { name: 'Pending approvals 1', exact: true })).toBeVisible();
            await expect(otherPage).toHaveTitle('Kings-Talloc');

            await page.getByRole('row').filter({ hasText: 'computing@kings.edu.au' }).getByRole('button', { name: 'Edit user', exact: true }).click();
            await expect(setting).not.toBeChecked();
            await setting.locator('xpath=ancestor::label[1]').click();
            await expect(setting).toBeChecked();
            await page.getByRole('button', { name: 'Save changes', exact: true }).click();
            await expect(setting).toHaveCount(0);
            // Reopen to verify persistence and let the live preference listener receive the save.
            await page.getByRole('row').filter({ hasText: 'computing@kings.edu.au' }).getByRole('button', { name: 'Edit user', exact: true }).click();
            await expect(setting).toBeChecked();
            await expect(otherPage).toHaveTitle('Kings-Talloc');
            await seedStudentRequestInEmulator('after-opt-in', request('New after opt-in', 3));
            await expect(otherPage).toHaveTitle('(1) Kings-Talloc');
            await setting.locator('xpath=ancestor::label[1]').click();
            await expect(setting).not.toBeChecked();
            await page.getByRole('button', { name: 'Save changes', exact: true }).click();
            await expect(otherPage).toHaveTitle('Kings-Talloc');
        } finally {
            await otherContext.close();
        }
    });

    test('Michael’s teacher view can approve and switching back preserves the queue', async ({ page }) => {
        await seedStudentRequestInEmulator('baseline', request('Baseline', 28));
        await page.goto('/dashboard');
        await expect(page.getByRole('button', { name: 'Pending approvals 1', exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'View as Teacher', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'Teacher dashboard', exact: true })).toBeVisible();
        await page.getByRole('link', { name: 'Calendar', exact: true }).click();
        await expect(page.getByRole('link', { name: /requests? awaiting approval/ })).toHaveCount(0);
        await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
        await page.getByRole('button', { name: 'Pending approvals 1', exact: true }).click();
        const dropdown = page.getByRole('dialog', { name: 'Pending approvals', exact: true }).getByRole('list');
        await expect(dropdown.getByText('Baseline', { exact: true })).toBeVisible();
        await expect(dropdown.getByRole('button', { name: 'Approve', exact: true })).toBeVisible();
        await seedStudentRequestInEmulator('new', request('New in teacher view', 3));
        await expect(page.getByRole('button', { name: 'Pending approvals 2', exact: true })).toBeVisible();
        await expect(page).toHaveTitle('Kings-Talloc');
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog', { name: 'Pending approvals', exact: true })).toHaveCount(0);
        await page.getByRole('button', { name: 'View as Admin', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Pending approvals 2', exact: true })).toBeVisible();
    });

    test('teachers without admin access can opt in; admins without teacher access cannot', async ({ page, browser }) => {
        await seedUserInEmulator('teacher@kings.edu.au', { email: 'teacher@kings.edu.au', name: 'Teacher', defaultRole: 'teacher', userRoles: [], requestNotificationsEnabled: true });
        await seedUserInEmulator('tutorAdmin@kings.edu.au', { email: 'tutorAdmin@kings.edu.au', name: 'Tutor Admin', defaultRole: 'tutor', userRoles: ['admin'], requestNotificationsEnabled: true });
        await page.goto('/userRoles');
        await page.getByRole('row').filter({ hasText: 'tutorAdmin@kings.edu.au' }).getByRole('button', { name: 'Edit user', exact: true }).click();
        await expect(page.getByRole('switch', { name: 'Tutoring request notifications', exact: true })).toHaveCount(0);
        const teacherContext = await browser.newContext({ storageState: 'tests/e2e/.auth/teacher.json' });
        const adminContext = await browser.newContext({ storageState: 'tests/e2e/.auth/tutorAdmin.json' });
        try {
            const teacher = await teacherContext.newPage();
            const admin = await adminContext.newPage();
            for (const tab of [teacher, admin]) {
                await tab.goto('/dashboard');
                await expect(tab.getByRole('button', { name: 'Pending approvals 0', exact: true })).toBeVisible();
                const session = await tab.context().newCDPSession(tab);
                await session.send('Emulation.setFocusEmulationEnabled', { enabled: false });
                const away = await tab.context().newPage();
                await away.goto('about:blank');
                await away.bringToFront();
            }
            await seedStudentRequestInEmulator('new', request('Teacher notification', 28));
            await expect(teacher).toHaveTitle('(1) Kings-Talloc');
            await expect(admin.getByRole('button', { name: 'Pending approvals 1', exact: true })).toBeVisible();
            await expect(admin).toHaveTitle('Kings-Talloc');
        } finally {
            await teacherContext.close();
            await adminContext.close();
        }
    });
});
