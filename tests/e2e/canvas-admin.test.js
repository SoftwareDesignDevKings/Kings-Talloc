import { test, expect } from '@playwright/test';

const math = { id: 101, name: 'Mathematics Year 10', course_code: 'MATH10', workflow_state: 'available', term_id: 26, term_name: '2026 Term 2', term_start_at: '2026-04-20T00:00:00Z', term_end_at: '2026-06-26T23:59:59Z' };
const science = { ...math, id: 102, name: 'Science with a long course name for readable responsive details', course_code: 'SCI11', term_id: 27, term_name: '2026 Term 3' };
const history = { ...math, id: 103, name: 'History Year 12', course_code: 'HIST12', workflow_state: 'completed' };
const idle = { is_running: false, last_status: 'success', last_full_sync_at: null };
const tab = (page, name) => page.getByRole('tab', { name });
const courseRow = (page, name) => page.getByRole('row').filter({ has: page.getByRole('cell', { name, exact: true }) });

// Every Canvas API request is intercepted. These tests never trigger a live sync or mutate a whitelist.
const installApi = async page => {
    const state = {
        available: [math, science, history], whitelist: [{ course_id: 101, name: math.name, courseCode: 'MATH10', blueprint_course_name: 'Mathematics Blueprint', blueprint_course_id: 900, last_synced: null }],
        status: { ...idle }, trigger: 'completed', adds: [], deletes: [], triggers: 0, statusReads: 0,
        addFailures: 0, removeFailures: 0, listFailures: 0, availableFailures: 0, statusFailures: 0, unexpected: [],
    };
    await page.route('**/api/canvas/**', async route => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        const json = (body, status = 200) => route.fulfill({ status, json: body });
        if (path === '/api/canvas/whitelist/available') {
            if (state.pauseAvailable) await new Promise(resolve => { state.releaseAvailable = resolve; });
            if (state.availableFailures-- > 0) return json({ message: 'Fixture list failed' }, 500);
            return json(state.available);
        }
        if (path === '/api/canvas/whitelist' && request.method() === 'GET') {
            if (state.listFailures-- > 0) return json({ message: 'Fixture list failed' }, 500);
            return json(state.whitelist);
        }
        if (path === '/api/canvas/whitelist' && request.method() === 'POST') {
            const data = request.postDataJSON(); state.adds.push(data);
            if (state.pauseAdd) await new Promise(resolve => { state.releaseAdd = resolve; });
            if (state.addFailures-- > 0) return json({ message: 'Fixture add failed' }, 500);
            const added = { ...data, courseCode: data.course_code };
            state.whitelist.push(added); return json(added);
        }
        if (path.startsWith('/api/canvas/whitelist/') && request.method() === 'DELETE') {
            const id = path.split('/').pop(); state.deletes.push(id);
            if (state.pauseRemove) await new Promise(resolve => { state.releaseRemove = resolve; });
            if (state.removeFailures-- > 0) return json({ message: 'Fixture remove failed' }, 500);
            state.whitelist = state.whitelist.filter(course => String(course.course_id) !== id); return json({ status: 'success' });
        }
        if (path === '/api/canvas/sync/status') {
            state.statusReads++;
            if (state.statusFailures-- > 0) return json({ message: 'Fixture status failed' }, 500);
            return json(state.status);
        }
        if (path === '/api/canvas/sync/trigger' && request.method() === 'POST') {
            state.triggers++;
            if (state.pauseSync) await new Promise(resolve => { state.releaseSync = resolve; });
            if (state.trigger === 'error') return json({ message: 'Fixture trigger failed' }, 500);
            if (state.trigger === 'already_running') {
                state.status = { is_running: true, progress: { phase: 'Enrollments', completedCourses: 1, totalCourses: 2 } };
                return json({ status: 'already_running' });
            }
            state.status = { ...idle, last_full_sync_at: '2026-10-15T00:00:00Z' };
            state.whitelist[0] = { ...state.whitelist[0], name: 'Refreshed Mathematics' };
            return json({ status: 'completed' });
        }
        state.unexpected.push(`${request.method()} ${path}`);
        return json({ message: 'Unexpected Canvas test request' }, 500);
    });
    return state;
};

test.describe('Canvas Admin UI @teacherAdmin @tutorAdmin', () => {
    test('tabs, filtering, add/remove payloads, busy states, and failures preserve the course workflow', async ({ page }) => {
        const state = await installApi(page);
        await page.goto('/admin/canvas');
        await expect(courseRow(page, math.name)).toContainText('Mathematics Blueprint');
        await tab(page, /^All Canvas Courses/).click();
        const search = page.getByPlaceholder('Search by name, code, or term', { exact: true });
        for (const query of ['  sCi11  ', '2026 term 3', 'science with a long']) {
            await search.fill(query);
            await expect(courseRow(page, science.name)).toBeVisible();
            await expect(courseRow(page, math.name)).toHaveCount(0);
        }
        await search.fill('unique-no-courses');
        await expect(page.getByText('No courses found.', { exact: true })).toBeVisible();
        await search.fill('');
        await expect(courseRow(page, math.name).getByRole('button', { name: 'Added', exact: true })).toBeDisabled();
        const add = courseRow(page, science.name).getByRole('button');
        state.addFailures = 1; state.pauseAdd = true;
        await add.click();
        await expect.poll(() => !!state.releaseAdd).toBe(true);
        await expect(add).toBeDisabled(); state.releaseAdd(); state.pauseAdd = false;
        await expect(page.getByText('Could not add course: Fixture add failed', { exact: true })).toBeVisible();
        await expect(add).toBeEnabled();
        await add.focus(); await page.keyboard.press('Enter');
        await expect(add).toHaveText('Added'); await expect(add).toBeDisabled();
        const payload = { course_id: science.id, name: science.name, course_code: science.course_code, term_id: science.term_id, term_name: science.term_name, term_start_at: science.term_start_at, term_end_at: science.term_end_at };
        expect(state.adds).toEqual([payload, payload]);
        await tab(page, /^Whitelisted/).click();
        await expect(courseRow(page, science.name)).toBeVisible();
        page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('from the Canvas whitelist?');
            await dialog.accept();
        });
        const remove = courseRow(page, math.name).getByRole('button', { name: 'Remove', exact: true });
        state.removeFailures = 1; state.pauseRemove = true;
        await remove.click(); await expect.poll(() => !!state.releaseRemove).toBe(true);
        await expect(courseRow(page, math.name).getByRole('button')).toBeDisabled(); state.releaseRemove(); state.pauseRemove = false;
        await expect(page.getByText('Could not remove course: Fixture remove failed', { exact: true })).toBeVisible();
        await remove.focus(); await page.keyboard.press('Space');
        await expect(courseRow(page, math.name)).toHaveCount(0);
        expect(state.deletes).toEqual(['101', '101']);
        await tab(page, /^All Canvas Courses/).click();
        await expect(search).toHaveValue('');
        await expect(courseRow(page, math.name).getByRole('button', { name: 'Add', exact: true })).toBeEnabled();
        expect(state.triggers).toBe(0); expect(state.unexpected).toEqual([]);
    });

    test('completed sync disables duplicate triggers and refreshes status and the whitelist', async ({ page }) => {
        const state = await installApi(page); state.pauseSync = true;
        await page.goto('/admin/canvas');
        const run = page.getByRole('button', { name: 'Run Sync', exact: true });
        await expect(run).toBeEnabled(); await run.click();
        await expect.poll(() => !!state.releaseSync).toBe(true);
        await expect(page.getByRole('button', { name: 'Running…', exact: true })).toBeDisabled();
        state.releaseSync();
        await expect(courseRow(page, 'Refreshed Mathematics')).toBeVisible();
        await expect(run).toBeEnabled();
        expect(state.triggers).toBe(1); expect(state.statusReads).toBe(2); expect(state.unexpected).toEqual([]);
    });

    test('already-running sync polls progress and stops after a failure', async ({ page }) => {
        await page.clock.install();
        const state = await installApi(page); state.trigger = 'already_running';
        await page.goto('/admin/canvas'); await page.getByRole('button', { name: 'Run Sync', exact: true }).click();
        await expect(page.getByText('A sync is already in progress.', { exact: true })).toBeVisible();
        await page.clock.fastForward(3100);
        await expect(page.getByText(/Syncing: Enrollments/)).toBeVisible();
        state.status = { is_running: false, last_status: 'failed', last_error: 'Fixture sync failed' };
        await page.clock.fastForward(3100);
        await expect(page.getByText('Sync failed: Fixture sync failed', { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Run Sync', exact: true })).toBeEnabled();
        const reads = state.statusReads; await page.clock.fastForward(10000);
        expect(state.statusReads).toBe(reads); expect(state.unexpected).toEqual([]);
    });

    test('trigger failure reports an error and lets the user retry', async ({ page }) => {
        const state = await installApi(page); state.trigger = 'error';
        await page.goto('/admin/canvas'); const run = page.getByRole('button', { name: 'Run Sync', exact: true });
        await expect(run).toBeEnabled(); await run.click();
        await expect(page.getByText('Sync error: Fixture trigger failed', { exact: true })).toBeVisible();
        await expect(run).toBeEnabled(); expect(state.triggers).toBe(1); expect(state.unexpected).toEqual([]);
    });

    test('a sync already running on entry is polled, recovers from a status outage, and refreshes on completion', async ({ page }) => {
        await page.clock.install();
        const state = await installApi(page);
        state.status = { is_running: true, progress: { phase: 'Courses', completedCourses: 0, totalCourses: 2 } };
        await page.goto('/admin/canvas');
        await expect(page.getByRole('button', { name: 'Running…', exact: true })).toBeDisabled();
        state.statusFailures = 1;
        await page.clock.fastForward(3100);
        await expect(page.getByText('Could not load sync status. Retry to check whether a sync is running.', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Retry status', exact: true }).click();
        await expect(page.getByText(/Syncing: Courses/)).toBeVisible();
        state.status = { ...idle, last_full_sync_at: '2026-10-15T00:00:00Z' };
        state.whitelist[0].name = 'Updated by background sync';
        await page.clock.fastForward(3100);
        await expect(courseRow(page, 'Updated by background sync')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Run Sync', exact: true })).toBeEnabled();
        const reads = state.statusReads; await page.clock.fastForward(10000);
        expect(state.statusReads).toBe(reads); expect(state.triggers).toBe(0); expect(state.unexpected).toEqual([]);
    });

    test('initial list and status failures offer independent retries and disable Add until the whitelist is known', async ({ page }) => {
        const state = await installApi(page);
        state.listFailures = 1; state.availableFailures = 1; state.statusFailures = 1;
        await page.goto('/admin/canvas');
        await expect(page.getByText('Could not load whitelisted courses.', { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Run Sync', exact: true })).toBeDisabled();
        await page.getByRole('button', { name: 'Retry status', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Run Sync', exact: true })).toBeEnabled();
        await tab(page, /^All Canvas Courses/).click();
        await expect(page.getByText('Could not load Canvas courses.', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Retry courses', exact: true }).click();
        await expect(courseRow(page, science.name).getByRole('button', { name: 'Add', exact: true })).toBeDisabled();
        await page.getByRole('button', { name: 'Retry whitelist', exact: true }).click();
        await expect(courseRow(page, science.name).getByRole('button', { name: 'Add', exact: true })).toBeEnabled();
        await expect(courseRow(page, math.name).getByRole('button', { name: 'Added', exact: true })).toBeDisabled();
        await tab(page, /^Whitelisted/).click();
        await expect(courseRow(page, math.name)).toBeVisible();
        expect(state.adds).toEqual([]); expect(state.triggers).toBe(0); expect(state.unexpected).toEqual([]);
    });

    test('empty lists, loading, clear search, and keyboard tabs work without losing the filter', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 900 });
        const state = await installApi(page); state.whitelist = []; state.pauseAvailable = true;
        await page.goto('/admin/canvas');
        await expect(page.getByText('No courses whitelisted yet. Add some from the All Canvas Courses tab.', { exact: true })).toBeVisible();
        await expect(tab(page, /^Whitelisted/)).toContainText('0');
        await expect.poll(() => page.getByRole('region', { name: 'Whitelisted courses table' }).evaluate(el => {
            const section = el.closest('[class*="canvasAdmin_container"]');
            return section.scrollWidth - section.clientWidth;
        })).toBeLessThanOrEqual(1);
        await page.getByRole('button', { name: 'Browse Canvas courses', exact: true }).click();
        await expect(page.getByRole('status').filter({ hasText: 'Loading courses…' })).toBeVisible();
        await expect.poll(() => !!state.releaseAvailable).toBe(true);
        state.releaseAvailable(); state.pauseAvailable = false;
        const search = page.getByRole('textbox', { name: 'Search Canvas courses', exact: true });
        await search.fill('SCI11');
        await tab(page, /^All Canvas Courses/).focus(); await page.keyboard.press('ArrowLeft');
        await expect(tab(page, /^Whitelisted/)).toBeFocused();
        await expect(tab(page, /^All Canvas Courses/)).toHaveAttribute('aria-selected', 'true');
        await page.keyboard.press('Enter');
        await expect(tab(page, /^Whitelisted/)).toHaveAttribute('aria-selected', 'true');
        await page.keyboard.press('ArrowRight'); await page.keyboard.press('Space');
        await expect(search).toHaveValue('SCI11');
        await expect(courseRow(page, science.name)).toBeVisible();
        await search.fill('no-course-matches');
        await page.getByRole('button', { name: 'Clear search', exact: true }).click();
        await expect(search).toHaveValue(''); await expect(courseRow(page, history.name)).toBeVisible();
        expect(state.adds).toEqual([]); expect(state.unexpected).toEqual([]);
    });

    test('long course details and actions remain readable at desktop, tablet, and phone sizes', async ({ page }) => {
        const state = await installApi(page);
        state.whitelist[0].blueprint_course_name = 'Blueprint course with a very long name that must wrap without hiding any details';
        await page.goto('/admin/canvas');
        for (const width of [1280, 768, 320]) {
            await page.setViewportSize({ width, height: 900 });
            await expect.poll(() => page.locator('[style*="--sidebar-w"]').evaluate(el => {
                const target = parseFloat(el.style.getPropertyValue('--sidebar-w')) * parseFloat(getComputedStyle(document.documentElement).fontSize);
                return Math.abs(el.getBoundingClientRect().width - target);
            })).toBeLessThan(.5);
            await page.evaluate(() => document.fonts.ready);
            await expect.poll(() => page.getByRole('tablist', { name: 'Canvas courses' }).evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
            const region = page.getByRole('region', { name: 'Whitelisted courses table' });
            await expect.poll(() => region.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
            await expect.poll(() => region.evaluate(el => {
                const section = el.closest('[class*="canvasAdmin_container"]');
                return section.scrollWidth - section.clientWidth;
            })).toBeLessThanOrEqual(1);
            await expect(courseRow(page, math.name)).toContainText(state.whitelist[0].blueprint_course_name);
            page.on('dialog', async dialog => {
            expect(dialog.message()).toContain('from the Canvas whitelist?');
            await dialog.accept();
        });
        const remove = courseRow(page, math.name).getByRole('button', { name: 'Remove', exact: true });
            await remove.focus();
            await expect(remove).toBeInViewport();
            expect(await remove.evaluate(el => {
                const button = el.getBoundingClientRect(); const row = el.closest('tr').getBoundingClientRect();
                return Math.max(button.bottom - row.bottom, button.right - row.right);
            })).toBeLessThanOrEqual(1);
            await tab(page, /^All Canvas Courses/).click();
            const allRegion = page.getByRole('region', { name: 'All Canvas courses table' });
            await expect.poll(() => allRegion.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
            await expect.poll(() => allRegion.evaluate(el => {
                const section = el.closest('[class*="canvasAdmin_container"]');
                const bounds = section.getBoundingClientRect();
                const tableBounds = el.getBoundingClientRect();
                return Math.max(section.scrollWidth - section.clientWidth, tableBounds.right - bounds.right, bounds.left - tableBounds.left);
            })).toBeLessThanOrEqual(1);
            await expect(courseRow(page, science.name)).toBeVisible();
            const search = page.getByRole('textbox', { name: 'Search Canvas courses', exact: true });
            await search.focus(); await expect(search).toBeInViewport();
            await page.screenshot({ path: test.info().outputPath(`canvas-admin-${width}.png`), fullPage: true });
            await tab(page, /^Whitelisted/).click();
        }
        expect(state.unexpected).toEqual([]);
    });


    test('a successful sync with a failed whitelist refresh can recover without another sync', async ({ page }) => {
        const state = await installApi(page);
        await page.goto('/admin/canvas');
        await expect(courseRow(page, math.name)).toBeVisible();
        state.listFailures = 1;
        await page.getByRole('button', { name: 'Run Sync', exact: true }).click();
        await expect(page.getByText('Canvas sync completed, but the whitelisted list could not refresh.', { exact: true })).toBeVisible();
        await expect(page.getByText('Could not load whitelisted courses.', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Retry courses', exact: true }).click();
        await expect(courseRow(page, 'Refreshed Mathematics')).toBeVisible();
        expect(state.triggers).toBe(1); expect(state.unexpected).toEqual([]);
    });

    test('long lists scroll by keyboard while the desktop headings and course actions remain usable', async ({ page }) => {
        const state = await installApi(page);
        state.available = Array.from({ length: 40 }, (_, i) => ({ ...math, id: 1000 + i, name: `Canvas course ${i + 1}` }));
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/admin/canvas'); await tab(page, /^All Canvas Courses/).click();
        const region = page.getByRole('region', { name: 'All Canvas courses table' });
        await expect(courseRow(page, 'Canvas course 1')).toBeVisible();
        await region.focus(); await page.keyboard.press('End');
        await expect.poll(() => region.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
        const lastAdd = courseRow(page, 'Canvas course 40').getByRole('button', { name: 'Add', exact: true });
        await lastAdd.focus(); await expect(lastAdd).toBeInViewport();
        const header = page.getByRole('columnheader', { name: 'Course Name', exact: true });
        await expect(header).toBeInViewport();
        await expect.poll(async () => {
            const a = await header.boundingBox(); const b = await region.boundingBox();
            return Math.abs(a.y - b.y);
        }).toBeLessThan(2);
        expect(state.adds).toEqual([]); expect(state.unexpected).toEqual([]);
    });

});
