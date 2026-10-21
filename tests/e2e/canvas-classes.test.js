import { test, expect } from '@playwright/test';
import { clearFirestoreEmulator, seedCanvasCourseInEmulator, seedCanvasEnrollmentInEmulator } from './wrapperFunctions';

const courses = [
    ['baseline-math', { name: 'Mathematics Year 10', courseCode: 'MATH10' }],
    ['baseline-science', { name: 'Science Year 11', courseCode: 'SCI11' }],
    ['baseline-history', { name: 'History Year 12' }],
];
const enrollments = [
    ['baseline-jane', { courseId: 'baseline-math', userId: 'jane', userName: 'Jane Student', email: 'jane@example.edu' }],
    ['baseline-alex', { courseId: 'baseline-math', userId: 'alex', emailLower: 'alex@example.edu' }],
];

// This suite clears its demo database. Never run it against a real project or remote host.
const emulatorDocuments = () => {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const host = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
    if (!projectId?.startsWith('demo-') || !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) {
        throw new Error('Canvas Classes browser tests require a demo-* project on a loopback Firestore emulator.');
    }
    return `http://${host}/v1/projects/${projectId}/databases/(default)/documents`;
};

const seedClasses = async () => {
    emulatorDocuments();
    await clearFirestoreEmulator();
    await Promise.all(courses.map(([id, course]) => seedCanvasCourseInEmulator(id, course)));
    await Promise.all(enrollments.map(([id, enrollment]) => seedCanvasEnrollmentInEmulator(id, enrollment)));
};

const readCanvasRecords = async () => {
    const entries = await Promise.all(['canvasCourses', 'canvasEnrollments', 'canvasUsers'].map(async (collection) => {
        const response = await fetch(`${emulatorDocuments()}/${collection}`);
        if (!response.ok) throw new Error(`Cannot read baseline ${collection}: ${response.status}`);
        const body = await response.json();
        expect(body.nextPageToken).toBeUndefined();
        return [collection, (body.documents || []).map(({ name, fields, updateTime }) => ({ name, fields, updateTime }))
            .sort((a, b) => a.name.localeCompare(b.name))];
    }));
    return Object.fromEntries(entries);
};

const row = (page, name) => page.getByRole('row').filter({ has: page.getByRole('cell', { name, exact: true }) });
const roster = (page, name) => page.getByRole('region', { name: `Students in ${name}`, includeHidden: true });
const openClasses = async (page) => {
    await page.goto('/classes');
    await expect(row(page, 'Mathematics Year 10')).toBeVisible();
};

test.describe('Canvas Classes baseline @teacherAdmin @teacherOnly @tutorAdmin', () => {
    test.beforeEach(seedClasses);

    test('loads real course/enrollment data and visibly expands each roster independently', async ({ page }, testInfo) => {
        await page.goto('/dashboard');
        await page.getByRole('link', { name: 'Canvas classes', exact: true }).click();
        await expect(page).toHaveURL(/\/classes$/);
        const math = row(page, 'Mathematics Year 10');
        await expect(math.getByRole('cell', { name: 'MATH10', exact: true })).toBeVisible();
        await expect(math.getByRole('cell', { name: '2', exact: true })).toBeVisible();
        await expect(math.getByRole('button')).toHaveCSS('border-radius', '8px');
        await expect(math.getByRole('button')).toHaveCSS('padding-top', '8px');
        await expect(math.getByRole('button')).toHaveCSS('font-weight', '600');
        await expect(row(page, 'History Year 12').getByRole('cell', { name: 'No code', exact: true })).toBeVisible();
        await expect(row(page, 'Science Year 11').getByRole('cell', { name: '0', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: /add class|edit|delete|remove/i })).toHaveCount(0);
        await expect(roster(page, 'Mathematics Year 10')).toBeHidden();
        const toggle = math.getByRole('button');
        await expect(toggle).toHaveAccessibleName('Show students in Mathematics Year 10');
        await expect(toggle).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        await expect(toggle).toHaveText('');
        const collapsedSize = await toggle.boundingBox();
        expect(collapsedSize.width).toBeGreaterThanOrEqual(36);
        expect(collapsedSize.height).toBeGreaterThanOrEqual(36);
        await toggle.click();
        await expect(toggle).toHaveAccessibleName('Hide students in Mathematics Year 10');
        const expandedSize = await toggle.boundingBox();
        expect(expandedSize.width).toBe(collapsedSize.width);
        expect(expandedSize.height).toBe(collapsedSize.height);
        await expect(roster(page, 'Mathematics Year 10')).toBeVisible();
        await expect(roster(page, 'Mathematics Year 10').getByRole('listitem')).toHaveCount(2);
        await expect(roster(page, 'Mathematics Year 10').getByText('Jane Student', { exact: true })).toBeVisible();
        await expect(roster(page, 'Mathematics Year 10').getByText('jane@example.edu', { exact: true })).toBeVisible();
        await expect(roster(page, 'Mathematics Year 10').getByText('alex@example.edu', { exact: true })).toHaveCount(2);
        await testInfo.attach('canvas-classes-desktop-baseline', { body: await page.screenshot(), contentType: 'image/png' });
        await row(page, 'Science Year 11').getByRole('button').click();
        await expect(roster(page, 'Science Year 11').getByText('No students added to this class yet.')).toBeVisible();
        await math.getByRole('button', { name: 'Hide students in Mathematics Year 10', exact: true }).click();
        await expect(roster(page, 'Mathematics Year 10')).toBeHidden();
        await expect(roster(page, 'Science Year 11')).toBeVisible();
    });

    test('searches by name/code and restores results and expansion when cleared', async ({ page }) => {
        await openClasses(page);
        await row(page, 'Mathematics Year 10').getByRole('button').click();
        const search = page.getByRole('textbox');
        await expect(search).toHaveAccessibleName('Search Canvas classes');
        await expect(search).toHaveCSS('padding-left', '36px');
        for (const query of ['mAtHeMaTiCs', '  math10  ']) {
            await search.fill(query);
            await expect(row(page, 'Mathematics Year 10')).toBeVisible();
            await expect(row(page, 'Science Year 11')).toHaveCount(0);
            await expect(row(page, 'History Year 12')).toHaveCount(0);
        }
        await search.fill('SCI11');
        await expect(row(page, 'Science Year 11')).toBeVisible();
        await expect(row(page, 'Mathematics Year 10')).toHaveCount(0);
        await search.fill('');
        for (const [, course] of courses) await expect(row(page, course.name)).toBeVisible();
        await expect(roster(page, 'Mathematics Year 10')).toBeVisible();
        await search.fill('   ');
        for (const [, course] of courses) await expect(row(page, course.name)).toBeVisible();
        await search.fill('no matching class');
        await expect(page.getByText('No classes match “no matching class”.')).toBeVisible();
        await page.getByRole('button', { name: 'Clear search', exact: true }).click();
        await expect(search).toHaveValue('');
        await search.fill('no matching class');
        await expect(page.getByRole('button', { name: /^(Show|Hide) students in / })).toHaveCount(0);
    });

    test('supports keyboard search and Enter/Space activation of roster controls', async ({ page }) => {
        await openClasses(page);
        const search = page.getByRole('textbox');
        await search.focus();
        await expect(search).toHaveAccessibleName('Search Canvas classes');
        await expect(search.locator('..')).toHaveAttribute('data-focus-within', 'true');
        await page.keyboard.type('MATH10');
        await expect(row(page, 'Science Year 11')).toHaveCount(0);
        await page.keyboard.press('Tab');
        await expect(page.getByRole('region', { name: 'Canvas classes table', exact: true })).toBeFocused();
        await page.keyboard.press('Tab');
        const button = row(page, 'Mathematics Year 10').getByRole('button');
        await expect(button).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(roster(page, 'Mathematics Year 10')).toBeVisible();
        await expect(button).toHaveAttribute('aria-expanded', 'true');
        await expect(button).toHaveCSS('outline-width', '2px');
        await page.keyboard.press('Space');
        await expect(roster(page, 'Mathematics Year 10')).toBeHidden();
        await expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    test('browsing, searching, and expanding leave all Canvas records unchanged', async ({ page }) => {
        const before = await readCanvasRecords();
        const writes = [];
        page.on('request', request => {
            if (request.url().includes('127.0.0.1:8080') && /Firestore\/Write|documents:(commit|batchWrite)/.test(request.url())) {
                writes.push(request.url());
            }
        });
        await openClasses(page);
        await page.getByRole('textbox').fill('math');
        await row(page, 'Mathematics Year 10').getByRole('button').click();
        await expect(roster(page, 'Mathematics Year 10')).toBeVisible();
        await page.getByRole('textbox').fill('');
        await row(page, 'Science Year 11').getByRole('button').click();
        await expect(roster(page, 'Science Year 11')).toBeVisible();
        await page.reload();
        await expect(row(page, 'Mathematics Year 10')).toBeVisible();
        expect(writes).toEqual([]);
        expect(await readCanvasRecords()).toEqual(before);
    });

    test('supports mobile search and roster actions', async ({ page }, testInfo) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await openClasses(page);
        try {
            const search = page.getByRole('textbox');
            await expect(search).toBeVisible();
            await search.fill('MATH10');
            const button = row(page, 'Mathematics Year 10').getByRole('button');
            await button.scrollIntoViewIfNeeded();
            await expect(button).toBeInViewport();
            await button.click();
            await expect(roster(page, 'Mathematics Year 10').getByText('Jane Student', { exact: true })).toBeVisible();
            await expect(roster(page, 'Mathematics Year 10').locator('[data-avatar]')).toHaveCount(0);
        } finally {
            await testInfo.attach('canvas-classes-mobile-baseline', { body: await page.screenshot(), contentType: 'image/png' });
        }
    });

    test('mobile search input fits completely inside the viewport', async ({ page }) => {
        for (const width of [390, 320]) {
            await page.setViewportSize({ width, height: 844 });
            await openClasses(page);
            await expect(page.getByRole('textbox')).toBeInViewport({ ratio: 1 });
        }
    });

    test('stacks each class into a card on phones without sideways scrolling', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await openClasses(page);
        const scrollArea = page.getByRole('region', { name: 'Canvas classes table', exact: true });
        await expect(scrollArea).toBeInViewport({ ratio: 1 });
        const cells = row(page, 'Mathematics Year 10').getByRole('cell');
        // Name, code and student count stack in one column with the toggle beside them.
        const [name, code, count, actions] = await Promise.all([0, 1, 2, 3].map(index => cells.nth(index).boundingBox()));
        expect(code.y).toBeGreaterThanOrEqual(name.y + name.height - 1);
        expect(count.y).toBeGreaterThanOrEqual(code.y + code.height - 1);
        expect(Math.abs(code.x - name.x)).toBeLessThanOrEqual(1);
        expect(actions.x).toBeGreaterThanOrEqual(name.x + name.width - 1);
        await expect(cells.nth(2)).toHaveText('2');
        const dimensions = await scrollArea.evaluate(el => ({ width: el.clientWidth, scrollWidth: el.scrollWidth }));
        expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 1);
        await scrollArea.focus();
        await expect(scrollArea).toHaveCSS('outline-width', '2px');
        const toggle = row(page, 'Mathematics Year 10').getByRole('button');
        await toggle.click();
        await expect(roster(page, 'Mathematics Year 10').getByText('Jane Student', { exact: true })).toBeInViewport({ ratio: 1 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    });
});

test.describe('Canvas Classes access @studentOnly @tutorOnly @coachOnly @coachTutor', () => {
    test('hides navigation and redirects a direct Classes URL to the dashboard', async ({ page }) => {
        await page.goto('/classes');
        await expect(page).toHaveURL(/\/dashboard$/);
        await expect(page.getByRole('heading', { name: /Dashboard$/ })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Canvas classes', exact: true })).toHaveCount(0);
        await expect(page.getByRole('heading', { name: 'Canvas classes', exact: true })).toHaveCount(0);
    });
});

test.describe('Canvas Classes table layout @teacherAdmin', () => {
    test.beforeEach(seedClasses);
    test.afterEach(seedClasses);

    test('keeps long course lists scrollable with visible column headings', async ({ page }) => {
        await Promise.all(Array.from({ length: 30 }, (_, index) => seedCanvasCourseInEmulator(`scroll-${index}`, {
            name: `Z scroll course ${String(index).padStart(2, '0')}`,
            courseCode: `SCROLL${index}`,
        })));
        await page.setViewportSize({ width: 1280, height: 720 });
        await openClasses(page);
        const scrollArea = page.getByRole('region', { name: 'Canvas classes table', exact: true });
        await expect(scrollArea).toBeInViewport({ ratio: 1 });
        const dimensions = await scrollArea.evaluate(el => ({ height: el.clientHeight, scrollHeight: el.scrollHeight }));
        expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.height);
        const lastRow = row(page, 'Z scroll course 29');
        await lastRow.scrollIntoViewIfNeeded();
        await expect(lastRow).toBeInViewport({ ratio: 1 });
        await expect(page.getByRole('columnheader', { name: 'Class name', exact: true })).toBeInViewport({ ratio: 1 });
        const areaBounds = await scrollArea.boundingBox();
        const headingBounds = await page.getByRole('columnheader', { name: 'Class name', exact: true }).boundingBox();
        expect(Math.abs(headingBounds.y - areaBounds.y)).toBeLessThanOrEqual(2);
    });
});

test.describe('Canvas Classes anonymous access @teacherAdmin', () => {
    test.use({ storageState: { cookies: [], origins: [] } });
    test('redirects an unauthenticated Classes URL to login', async ({ page }) => {
        await page.goto('/classes');
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole('button', { name: 'Sign in with Microsoft', exact: true })).toBeVisible();
    });
});

test.describe('Canvas Classes roster layout @teacherAdmin', () => {
    test.beforeEach(seedClasses);
    test.afterEach(seedClasses);

    test('wraps long student details and supports keyboard scrolling through large rosters', async ({ page }, testInfo) => {
        const longName = 'Alexandra Montgomery-Wellington';
        const longEmail = 'averylongstudentaddress.1234567890@students.example.edu';
        await seedCanvasEnrollmentInEmulator('roster-00-long', {
            courseId: 'baseline-math', userId: 'roster-long', userName: longName, email: longEmail,
        });
        await Promise.all(Array.from({ length: 20 }, (_, index) => seedCanvasEnrollmentInEmulator(`roster-${String(index).padStart(2, '0')}`, {
            courseId: 'baseline-math', userId: `roster-${index}`,
            userName: `Z Student ${String(index).padStart(2, '0')}`, email: `scroll${index}@example.edu`,
        })));
        await page.setViewportSize({ width: 320, height: 844 });
        await openClasses(page);
        await page.getByRole('textbox').fill('MATH10');
        await row(page, 'Mathematics Year 10').getByRole('button').click();
        const region = roster(page, 'Mathematics Year 10');
        await expect(region.getByRole('listitem')).toHaveCount(23);
        await expect(region.locator('[data-avatar]')).toHaveCount(0);
        await expect(region.getByRole('button', { name: 'Remove', exact: true })).toHaveCount(0);
        const email = region.getByText(longEmail, { exact: true });
        await expect(region.getByText(longName, { exact: true })).toHaveCSS('overflow-wrap', 'anywhere');
        await email.scrollIntoViewIfNeeded();
        await expect(email).toBeInViewport({ ratio: 1 });
        const dimensions = await region.evaluate(el => ({ width: el.clientWidth, scrollWidth: el.scrollWidth, height: el.clientHeight, scrollHeight: el.scrollHeight }));
        expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width + 1);
        expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.height);
        await row(page, 'Mathematics Year 10').getByRole('button').focus();
        await page.keyboard.press('Tab');
        await expect(region).toBeFocused();
        await expect(region).toHaveCSS('outline-width', '2px');
        await page.keyboard.press('End');
        await expect(region.getByText('Z Student 19', { exact: true })).toBeInViewport({ ratio: 1 });
        await testInfo.attach('canvas-classes-roster-mobile', { body: await page.screenshot(), contentType: 'image/png' });
    });
});
