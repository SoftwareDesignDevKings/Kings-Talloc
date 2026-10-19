import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });
test.setTimeout(60000);
const accounts = [
    ['Michael (Notifications)', 'mienna@kings.edu.au'], ['Teacher + Admin', 'computing@kings.edu.au'],
    ['Tutor + Admin', 'tutorAdmin@kings.edu.au'], ['Teacher', 'teacher@kings.edu.au'],
    ['Coach + Tutor', 'coachTutor@kings.edu.au'], ['Coach', 'coach@kings.edu.au'],
    ['Tutor', 'tutor@kings.edu.au'], ['Student', 'student@kings.edu.au'],
];
test.beforeEach(() => {
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.startsWith('demo-')) throw new Error('Entry page checks require the local demo application');
});

test('landing copy and Get Started navigation remain usable at desktop and phone widths @teacherAdmin', async ({ page }) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
        if (message.type() === 'error' && /legacyBehavior|hydration|validateDOMNesting/i.test(message.text())) errors.push(message.text());
    });
    for (const width of [1280, 390, 320]) {
        await page.setViewportSize({ width, height: 740 }); await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: 'Kings-Talloc', exact: true })).toBeVisible();
        for (const name of ['Schedule Sessions', 'Assign Tutors', 'Tutor Availability', 'Manage Classes']) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
        const start = page.getByRole('link', { name: 'Get Started', exact: true });
        await start.focus(); await expect(start).toBeInViewport({ ratio: 1 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
        await page.screenshot({ path: `/tmp/landing-${width}.png`, fullPage: true, animations: 'disabled' });
        await start.press('Enter'); await expect(page).toHaveURL('/login');
        await expect(page.getByRole('button', { name: 'Sign in with Microsoft', exact: true })).toBeVisible();
    }
    expect(errors).toEqual([]);
});

test('login preserves branding, account order and keyboard-reachable controls on small screens @teacherAdmin', async ({ page }) => {
    await page.goto('/login');
    for (const width of [1280, 390, 320]) {
        await page.setViewportSize({ width, height: 568 });
        await expect(page.getByRole('img', { name: "The King's School Logo" })).toBeVisible();
        await expect(page.getByText('Please sign in to access your dashboard.', { exact: true })).toBeVisible();
        await expect(page.locator('button').filter({ hasText: /^(Michael \(Notifications\)|Teacher \+ Admin|Tutor \+ Admin|Teacher|Coach \+ Tutor|Coach|Tutor|Student)$/ })).toHaveText(accounts.map(([label]) => label));
        for (const label of [...accounts.map(([label]) => label), 'Sign in with Microsoft']) {
            const button = page.getByRole('button', { name: label, exact: true });
            await button.focus(); await expect(button).toBeInViewport({ ratio: 1 });
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
        await page.screenshot({ path: `/tmp/login-${width}.png`, fullPage: true, animations: 'disabled' });
    }
});

test('Microsoft activation keeps the azure-ad provider and Dashboard callback without contacting Microsoft @teacherAdmin', async ({ page }) => {
    let callback;
    await page.route('https://login.microsoftonline.com/**', route => route.abort());
    await page.route('**/api/auth/signin/azure-ad', route => {
        callback = new URLSearchParams(route.request().postData()).get('callbackUrl');
        return route.fulfill({ json: { url: new URL('/login?ui_auth_check=1', route.request().url()).href } });
    });
    await page.goto('/login');
    const microsoft = page.getByRole('button', { name: 'Sign in with Microsoft', exact: true });
    await expect(microsoft).toBeEnabled();
    await microsoft.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/login?ui_auth_check=1');
    expect(callback).toBe('/dashboard');
});

for (const [label, email] of accounts) {
    test(`${label} signs into its existing demo account and authenticated /login redirects @teacherAdmin`, async ({ page }) => {
        await page.goto('/login');
        await page.getByRole('button', { name: label, exact: true }).click();
        await expect(page).toHaveURL('/dashboard');
        const session = await (await page.request.get('/api/auth/session')).json();
        expect(session.user.email).toBe(email);
        await page.goto('/login'); await expect(page).toHaveURL('/dashboard');
        // Student onboarding is intentionally left untouched; no preferences
        // or database records are changed by these authentication checks.
    });
}
