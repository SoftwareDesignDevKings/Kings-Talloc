import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { toFirestoreValue } from './wrapperFunctions';

const email = 'ui-coverage-migrate@example.edu';
const archived = { key: 'course:ui-coverage-archived', type: 'course', id: 'ui-coverage-archived', label: 'Archived Coverage' };
const courses = [
    { id: 'ui-coverage-linked-a', name: 'Coverage SEN A', blueprintCourseId: 'ui-coverage-blueprint', blueprintCourseCode: 'BP_12COV' },
    { id: 'ui-coverage-linked-b', name: 'Coverage SEN B', blueprintCourseId: 'ui-coverage-blueprint', blueprintCourseCode: 'BP_12COV' },
    { id: 'ui-coverage-robotics', name: 'Coverage Robotics', courseCode: 'CRO' },
];
const documents = () => {
    const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const host = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
    if (!project?.startsWith('demo-') || !/^(localhost|127\.0\.0\.1):\d+$/.test(host)) throw new Error('Coverage checks require local demo emulators.');
    return `http://${host}/v1/projects/${project}/databases/(default)/documents`;
};
const read = async path => { const response = await fetch(`${documents()}/${path}`); expect(response.ok).toBe(true); return response.json(); };
const decode = value => {
    if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, decode(item)]));
    if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode);
    return value.stringValue ?? value.booleanValue ?? value.integerValue ?? value.nullValue;
};
const userData = record => Object.fromEntries(Object.entries(record.fields).map(([key, value]) => [key, decode(value)]));
const dialog = page => page.getByRole('dialog', { name: 'Edit User', exact: true });
const trigger = page => page.getByRole('button', { name: 'Tutor Class Coverage', exact: true });
const expectChipAlignment = async page => {
    for (const id of ['userRole', 'tutorCoverage']) {
        const spacingDifference = await page.locator(`#${id}`).evaluate(el => {
            const control = el.parentElement.getBoundingClientRect();
            const chips = el.parentElement.querySelector('[data-multi-select-chip]').parentElement.getBoundingClientRect();
            return Math.abs((chips.top - control.top) - (control.bottom - chips.bottom));
        });
        expect(spacingDifference).toBeLessThanOrEqual(1);
    }
};
const expectFooterGap = async page => {
    const cancel = await dialog(page).getByRole('button', { name: 'Cancel', exact: true }).boundingBox();
    const save = await dialog(page).getByRole('button', { name: 'Save Changes', exact: true }).boundingBox();
    expect(save.x - cancel.x - cancel.width).toBeGreaterThanOrEqual(8);
};
const expectMenuBelow = async page => {
    const menu = page.locator('[data-untitled-fixed-bottom]');
    await expect(menu).toHaveAttribute('data-placement', 'bottom');
    await expect.poll(() => menu.evaluate(el => {
        const field = document.getElementById('tutorCoverage').parentElement.getBoundingClientRect();
        const bounds = el.getBoundingClientRect();
        return bounds.top >= field.bottom && bounds.bottom <= window.innerHeight - 7 && bounds.height >= 80;
    })).toBe(true);
};
const search = async (page, query) => {
    if (await trigger(page).count()) {
        await trigger(page).click();
        await page.getByRole('searchbox', { name: 'Search Tutor Class Coverage', exact: true }).fill(query);
    } else {
        const input = page.getByRole('combobox', { name: 'Tutor Class Coverage', exact: true });
        await input.click(); if (query) await input.fill(query);
    }
};
const select = async (page, query, label) => { await search(page, query); await page.getByRole('option', { name: label, exact: true }).click(); };
const edit = async page => {
    await page.getByRole('row').filter({ hasText: email }).getByRole('button', { name: 'Edit user', exact: true }).click();
    await expect(dialog(page)).toBeVisible(); await expect(dialog(page)).toHaveCSS('opacity', '1');
};
test.setTimeout(90000);
test.describe('Tutor Class Coverage @teacherAdmin @tutorAdmin', () => {
    test.beforeEach(async ({ page }) => {
        const base = documents(); const prefix = new URL(base).pathname.replace('/v1/', '');
        const records = [[`users/${email}`, { email, name: 'Coverage Migration Check', defaultRole: 'tutor', role: 'tutor', userRoles: [], tutorCoverage: [archived], tutorCoverageKeys: [archived.key] }], ...courses.map(course => [`canvasCourses/${course.id}`, course])];
        const response = await fetch(`${base}:commit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ writes: records.map(([path, data]) => ({ update: { name: `${prefix}/${path}`, fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)])) } })) }) });
        expect(response.ok).toBe(true);
        // Saving is real; isolate the global rebuild endpoint from unrelated review records.
        await page.route('**/api/canvas/tutor-eligibility/rebuild', route => route.fulfill({ json: { status: 'success' } }));
        await page.goto('/userRoles'); await edit(page);
    });
    test.afterEach(async () => {
        const base = documents(); const prefix = new URL(base).pathname.replace('/v1/', '');
        const paths = [`users/${email}`, ...courses.map(course => `canvasCourses/${course.id}`)];
        const response = await fetch(`${base}:commit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ writes: paths.map(path => ({ delete: `${prefix}/${path}` })) }) });
        expect(response.ok).toBe(true);
    });
    test('groups blueprint options once, preserves archived selections, saves complete coverage and cancels drafts', async ({ page }) => {
        await expectFooterGap(page);
        await expectChipAlignment(page);
        await expect(dialog(page).getByText('Archived Coverage', { exact: true })).toBeVisible();
        await search(page, '');
        await expectMenuBelow(page);
        await expect(page.getByText('Blueprints', { exact: true })).toBeVisible();
        await expect(page.getByText('Courses without blueprint', { exact: true })).toBeVisible();
        await expect(page.getByRole('option', { name: '12COV', exact: true })).toHaveCount(1);
        await page.getByRole('option', { name: '12COV', exact: true }).click();
        await expect(dialog(page).getByText('Archived Coverage', { exact: true })).toBeVisible();
        await select(page, 'Coverage Robotics', 'Coverage Robotics (CRO)');
        await expectChipAlignment(page);
        await dialog(page).getByRole('button', { name: 'Save Changes', exact: true }).click();
        await expect(dialog(page)).toHaveCount(0);
        const saved = await read(`users/${email}`); const data = userData(saved);
        expect(data.tutorCoverage).toEqual([archived,
            { key: 'blueprint:ui-coverage-blueprint', type: 'blueprint', id: 'ui-coverage-blueprint', label: '12COV', courseCode: 'BP_12COV' },
            { key: 'course:ui-coverage-robotics', type: 'course', id: 'ui-coverage-robotics', label: 'Coverage Robotics (CRO)', courseCode: 'CRO' }]);
        expect(data.tutorCoverageKeys).toEqual(data.tutorCoverage.map(item => item.key));
        if (process.env.COVERAGE_SAVED_USER) await writeFile(process.env.COVERAGE_SAVED_USER, JSON.stringify(data));
        // Reload so this check reads persisted coverage, independent of the list's async refresh.
        await page.reload(); await edit(page);
        for (const label of ['Archived Coverage', '12COV', 'Coverage Robotics (CRO)']) await expect(dialog(page).getByText(label, { exact: true })).toBeVisible();
        await search(page, 'no-matching-course'); await expect(page.getByText('No matching Canvas courses', { exact: true })).toBeVisible();
        await page.keyboard.press('Escape'); await expect(dialog(page)).toBeVisible();
        await dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click();
        expect(await read(`users/${email}`)).toEqual(saved);
    });
    test('keyboard menus fit mobile, clearing can be cancelled and removing tutor access clears saved coverage', async ({ page }) => {
        const before = await read(`users/${email}`);
        await page.setViewportSize({ width: 320, height: 568 });
        await expectFooterGap(page);
        await search(page, ''); await expectMenuBelow(page);
        await page.getByRole('searchbox', { name: 'Search Tutor Class Coverage', exact: true }).fill('Coverage Robotics');
        const option = page.getByRole('option', { name: 'Coverage Robotics (CRO)', exact: true });
        await expect(option).toBeInViewport({ ratio: 1 });
        expect(await option.evaluate(el => !!el.closest('[data-untitled-modal-overlay]'))).toBe(true);
        await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
        await expect(dialog(page).getByText('Coverage Robotics (CRO)', { exact: true })).toBeVisible();
        await expectChipAlignment(page);
        if (await trigger(page).count()) await dialog(page).getByRole('button', { name: 'Clear Tutor Class Coverage', exact: true }).click();
        else await page.locator('.select__clear-indicator').click();
        await expect(dialog(page).getByText('Archived Coverage', { exact: true })).toHaveCount(0);
        await dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click(); expect(await read(`users/${email}`)).toEqual(before);
        await edit(page); await expect(dialog(page).getByText('Archived Coverage', { exact: true })).toBeVisible();
        await dialog(page).getByRole('button', { name: 'Roles', exact: true }).click(); await page.getByRole('option', { name: 'Coach', exact: true }).click();
        await expect(dialog(page).getByLabel('Tutor Class Coverage', { exact: true })).toBeVisible();
        await dialog(page).getByRole('button', { name: 'Remove Tutor', exact: true }).click();
        await expect(page.getByLabel('Tutor Class Coverage', { exact: true })).toHaveCount(0);
        await dialog(page).getByRole('button', { name: 'Save Changes', exact: true }).click(); await expect(dialog(page)).toHaveCount(0);
        const saved = userData(await read(`users/${email}`)); expect(saved.tutorCoverage).toEqual([]); expect(saved.tutorCoverageKeys).toEqual([]);
    });
});
