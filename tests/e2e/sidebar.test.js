import { test, expect } from '@playwright/test';

const menus = {
    'admin-tests': ['Dashboard', 'Calendar', 'Tutor Hours', 'Manage Users', 'Canvas Classes', 'Canvas Admin'],
    'tutorAdmin-tests': ['Dashboard', 'Calendar', 'Tutor Hours', 'Manage Users', 'Canvas Classes', 'Canvas Admin'],
    'teacher-tests': ['Dashboard', 'Calendar', 'Tutor Hours', 'Canvas Classes'],
    'tutor-tests': ['Dashboard', 'Calendar', 'Tutor Hours'],
    'coach-tests': ['Dashboard', 'Calendar', 'Tutor Hours'],
    'coachTutor-tests': ['Dashboard', 'Calendar', 'Tutor Hours'],
    'student-tests': ['Dashboard', 'Calendar'],
};
const routes = {
    Dashboard: '/dashboard', Calendar: '/calendar', 'Tutor Hours': '/tutorHours',
    'Manage Users': '/userRoles', 'Canvas Classes': '/classes', 'Canvas Admin': '/admin/canvas',
};
const sidebar = page => page.locator('[style*="--sidebar-w"]');
const readyDashboard = async page => {
    await expect(sidebar(page)).toBeVisible();
    await expect(page.getByRole('heading', { name: /^(Events for Today|Today's Sessions)$/ })).toBeVisible();
};
const readyDestination = async (page, label) => {
    if (label === 'Dashboard') return readyDashboard(page);
    if (label === 'Calendar') return expect(page.locator('.rbc-calendar')).toBeVisible();
    if (label === 'Tutor Hours') return expect(page.getByRole('textbox', { name: 'Start Date', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: label === 'Manage Users' ? 'Manage User Roles' : label, exact: true })).toBeVisible();
};
let onboarding;
const studentDocument = () => {
    const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const host = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
    if (!project?.startsWith('demo-') || !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) throw new Error('Sidebar checks require local demo emulators.');
    return `http://${host}/v1/projects/${project}/databases/(default)/documents/users/student@kings.edu.au`;
};
const onboardingMask = '?updateMask.fieldPaths=hasSeenWelcome&updateMask.fieldPaths=hasSeenCalendarHelp';
const settleWidth = async (page, width) => {
    await expect(sidebar(page)).toHaveCSS('--sidebar-w', `${width / 16}rem`);
    await expect.poll(() => sidebar(page).evaluate((el, rem) => {
        const expected = rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
        return Math.abs(el.getBoundingClientRect().width - expected);
    }, width / 16)).toBeLessThan(0.5);
};

test.describe('Sidebar @teacherAdmin @tutorAdmin @teacherOnly @tutorOnly @coachOnly @coachTutor @studentOnly', () => {
    test.beforeAll(async ({}, testInfo) => {
        if (testInfo.project.name !== 'student-tests') return;
        const response = await fetch(studentDocument());
        if (!response.ok) throw new Error('Cannot read student demo onboarding baseline.');
        const { fields } = await response.json();
        onboarding = Object.fromEntries(['hasSeenWelcome', 'hasSeenCalendarHelp'].filter(key => key in fields).map(key => [key, fields[key]]));
        // Onboarding modals are outside this batch. Restore these exact preferences below.
        const seeded = await fetch(studentDocument() + onboardingMask, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: { hasSeenWelcome: { booleanValue: true }, hasSeenCalendarHelp: { booleanValue: true } } }),
        });
        if (!seeded.ok) throw new Error('Cannot prepare student demo onboarding preferences.');
    });
    test.afterAll(async ({}, testInfo) => {
        if (testInfo.project.name !== 'student-tests' || !onboarding) return;
        const restored = await fetch(studentDocument() + onboardingMask, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: onboarding }),
        });
        if (!restored.ok) throw new Error('Cannot restore student demo onboarding preferences.');
    });
    test('role-specific links keep their order and navigate without resetting the sidebar', async ({ page }, testInfo) => {
        await page.goto('/dashboard');
        await readyDashboard(page);
        const menu = sidebar(page);
        const expected = menus[testInfo.project.name];
        await expect(menu.getByRole('link')).toHaveText(expected);
        const errors = [];
        page.on('pageerror', error => errors.push(error.stack));
        await menu.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
        await settleWidth(page, 80);
        for (const label of expected) {
            const link = menu.getByRole('link', { name: label, exact: true });
            await expect(link).toHaveAttribute('href', routes[label]);
            await link.focus();
            await expect(link).toBeFocused();
            await page.keyboard.press('Enter');
            await expect(page).toHaveURL(routes[label]);
            await readyDestination(page, label);
            await expect(menu.getByRole('button', { name: 'Expand sidebar', exact: true })).toBeVisible();
            await settleWidth(page, 80);
        }
        await menu.getByRole('button', { name: 'Expand sidebar', exact: true }).focus();
        await page.keyboard.press('Space');
        await settleWidth(page, 256);
        await expect(menu.getByRole('link')).toHaveText(expected);
        expect(errors).toEqual([]);
    });

    test('desktop and mobile retain usable collapsed navigation and footer controls', async ({ page }, testInfo) => {
        await page.goto('/dashboard');
        await readyDashboard(page);
        const menu = sidebar(page);
        await expect(menu.getByRole('button', { name: 'Collapse sidebar', exact: true })).toBeVisible();
        for (const width of [1280, 846, 390, 320]) {
            await page.setViewportSize({ width, height: 740 });
            if (width < 768) {
                await expect(menu.getByRole('button', { name: 'Expand sidebar', exact: true })).toBeVisible();
            }
            if (await menu.getByRole('button', { name: 'Collapse sidebar', exact: true }).count()) {
                await menu.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
            }
            await settleWidth(page, 80);
            for (const label of menus[testInfo.project.name]) {
                const link = menu.getByRole('link', { name: label, exact: true });
                await link.focus();
                await expect(link).toBeInViewport({ ratio: 1 });
            }
            const logout = menu.getByRole('button', { name: 'Logout', exact: true });
            await logout.focus();
            await expect(logout).toBeInViewport({ ratio: 1 });
            await expect.poll(() => menu.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
            await menu.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
            await settleWidth(page, 256);
            await expect(menu.getByRole('link')).toHaveText(menus[testInfo.project.name]);
            await expect(logout).toBeInViewport({ ratio: 1 });
        }
    });

    test('Logout ends the current session and returns to login', async ({ page }) => {
        await page.goto('/dashboard');
        await readyDashboard(page);
        await sidebar(page).getByRole('button', { name: 'Logout', exact: true }).focus();
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL('/login');
        await expect(page.getByRole('button', { name: 'Teacher + Admin', exact: true })).toBeVisible();
        await page.goto('/userRoles');
        await expect(sidebar(page)).toHaveCount(0);
    });
});

test.describe('Sidebar role switching @teacherAdmin @tutorAdmin', () => {
    test('switches between admin and default role and preserves existing navigation and refresh behaviour', async ({ page }, testInfo) => {
        const defaultRole = testInfo.project.name === 'admin-tests' ? 'Teacher' : 'Tutor';
        await page.goto('/dashboard');
        await sidebar(page).getByRole('button', { name: `View as ${defaultRole}`, exact: true }).click();
        await expect(page.getByRole('heading', { name: `${defaultRole} Dashboard`, exact: true })).toBeVisible();
        await expect(sidebar(page).getByRole('link')).toHaveText(menus[defaultRole.toLowerCase() + '-tests']);
        await sidebar(page).getByRole('link', { name: 'Calendar', exact: true }).click();
        await expect(page).toHaveURL('/calendar');
        await expect(page.getByRole('heading', { name: `${defaultRole} Dashboard`, exact: true })).toBeVisible();
        await sidebar(page).getByRole('button', { name: 'View as Admin', exact: true }).focus();
        await page.keyboard.press('Space');
        await expect(page.getByRole('heading', { name: 'Admin Dashboard', exact: true })).toBeVisible();
        await expect(sidebar(page).getByRole('link')).toHaveText(menus[testInfo.project.name]);
        await expect(page).toHaveURL('/calendar');
        await sidebar(page).getByRole('button', { name: `View as ${defaultRole}`, exact: true }).click();
        await expect(page.getByRole('heading', { name: `${defaultRole} Dashboard`, exact: true })).toBeVisible();
        await page.reload();
        // Main's current auth initialization returns to Admin on a full reload.
        // Keep that behavior; role persistence changes are outside this UI port.
        await expect(page.getByRole('heading', { name: 'Admin Dashboard', exact: true })).toBeVisible();
    });
});
