import { test, expect } from '@playwright/test';
import { seedUserInEmulator, seedCanvasCourseInEmulator } from './wrapperFunctions';
import { readFile } from 'node:fs/promises';

const fixtureEmail = 'ui-cancel-check@example.edu';
const createdEmail = 'ui-create-check@example.edu';
const fixture = {
    email: fixtureEmail, name: 'Cancel Check Teacher', role: 'teacher', defaultRole: 'teacher',
    userRoles: [], requestNotificationsEnabled: false,
};
const extraRoleFixture = {
    email: 'ui-search-role-check@example.edu', name: 'Additional Role Check',
    role: 'tutor', defaultRole: 'tutor', userRoles: ['admin'],
};

const documents = () => {
    const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const host = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
    if (!project?.startsWith('demo-') || !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) {
        throw new Error('Cancel checks require a demo-* project on a loopback Firestore emulator.');
    }
    return `http://${host}/v1/projects/${project}/databases/(default)/documents`;
};

const readUsers = async () => {
    const response = await fetch(`${documents()}/users?pageSize=1000`);
    if (!response.ok) throw new Error(`Cannot read user baseline: ${response.status}`);
    const body = await response.json();
    expect(body.nextPageToken).toBeUndefined();
    return (body.documents || []).map(({ name, fields, updateTime }) => ({ name, fields, updateTime }))
        .sort((a, b) => a.name.localeCompare(b.name));
};

const monitorWrites = page => {
    const writes = [];
    page.on('request', request => {
        if ((request.url().includes('127.0.0.1:8080') && /Firestore\/Write|documents:(commit|batchWrite)/.test(request.url()))
            || (/\/api\/(users|canvas\/tutor-eligibility\/rebuild)/.test(request.url()) && request.method() !== 'GET')) {
            writes.push(request.url());
        }
    });
    return writes;
};

const roleControl = dialog => dialog.getByRole('button', { name: 'Roles', exact: true });
const rolesField = dialog => dialog.locator('[data-untitled-multi-select]:has(#userRole)');
const selectRole = async (page, dialog, key) => {
    await roleControl(dialog).click();
    await page.getByRole('option', { name: key[0].toUpperCase() + key.slice(1), exact: true }).click();
};
const settleSidebar = async page => {
    await expect.poll(() => page.locator('[style*="--sidebar-w"]').evaluate(el => {
        const target = parseFloat(el.style.getPropertyValue('--sidebar-w')) * parseFloat(getComputedStyle(document.documentElement).fontSize);
        return Math.abs(el.getBoundingClientRect().width - target);
    })).toBeLessThan(0.5);
};

const expectClosed = async page => {
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('[data-untitled-modal-overlay]')).toHaveCount(0);
    await expect(page.locator('.modal-backdrop')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveClass(/modal-open/);
};

const readyDialog = async (page, name) => {
    const dialog = page.getByRole('dialog', { name, exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveCSS('opacity', '1');
    const header = await dialog.locator('.modal-header').boundingBox();
    const close = await dialog.getByRole('button', { name: 'Close', exact: true }).boundingBox();
    const rightGap = header.x + header.width - close.x - close.width;
    expect(rightGap).toBeGreaterThanOrEqual(0);
    expect(rightGap).toBeLessThanOrEqual(20);
    return dialog;
};

test.describe('Manage User Roles UI @teacherAdmin @tutorAdmin', () => {
    test.beforeEach(async () => {
        documents();
        await seedUserInEmulator(fixtureEmail, fixture);
    });
    test.afterEach(async () => {
        // Remove only this suite's disposable fixtures; preserve all other records.
        for (const email of [fixtureEmail, extraRoleFixture.email, createdEmail]) {
            const response = await fetch(`${documents()}/users/${email}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(`Cannot remove UI fixture: ${response.status}`);
        }
        const response = await fetch(`${documents()}/timesheets/${extraRoleFixture.email}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(`Cannot remove timesheet UI fixture: ${response.status}`);
        for (const id of ['ui-coverage-one', 'ui-coverage-two']) {
            const response = await fetch(`${documents()}/canvasCourses/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(`Cannot remove coverage UI fixture: ${response.status}`);
        }
    });

    test('Cancel discards create/edit drafts and cleans up the dialog without saving', async ({ page }) => {
        await page.goto('/userRoles');
        const userRow = page.getByRole('row').filter({ hasText: fixtureEmail });
        await expect(userRow).toBeVisible();
        await expect(page.getByRole('button', { name: 'Add User Role', exact: true })).toHaveCSS('border-radius', '8px');
        await expect(userRow.getByRole('button', { name: 'Edit user', exact: true })).toHaveCSS('border-radius', '8px');
        const before = await readUsers();
        const writes = monitorWrites(page);
        await page.getByRole('button', { name: 'Add User Role', exact: true }).click();
        let dialog = await readyDialog(page, 'Add New User');
        await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toHaveCSS('border-radius', '8px');
        await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toHaveAttribute('type', 'button');
        await dialog.getByLabel('Email Address', { exact: true }).fill('unsaved@example.edu');
        await dialog.getByLabel('Full Name', { exact: true }).fill('Unsaved create');
        await selectRole(page, dialog, 'teacher');
        await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
        await expectClosed(page);

        await page.getByRole('button', { name: 'Add User Role', exact: true }).click();
        dialog = await readyDialog(page, 'Add New User');
        await expect(dialog.getByLabel('Email Address', { exact: true })).toHaveValue('');
        await expect(dialog.getByLabel('Full Name', { exact: true })).toHaveValue('');
        await expect(rolesField(dialog)).toContainText('Student');
        await dialog.getByRole('button', { name: 'Close', exact: true }).click();
        await expectClosed(page);

        await userRow.getByRole('button', { name: 'Edit user', exact: true }).click();
        dialog = await readyDialog(page, 'Edit User');
        await expect(dialog.getByLabel('Email Address', { exact: true })).toBeDisabled();
        await dialog.getByLabel('Full Name', { exact: true }).fill('Unsaved edit');
        await selectRole(page, dialog, 'coach');
        await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
        await expectClosed(page);
        await userRow.getByRole('button', { name: 'Edit user', exact: true }).click();
        dialog = await readyDialog(page, 'Edit User');
        await expect(dialog.getByLabel('Full Name', { exact: true })).toHaveValue(fixture.name);
        await expect(rolesField(dialog)).toContainText('Teacher');
        await expect(dialog.getByRole('switch', { name: 'Tutoring request notifications', exact: true })).not.toBeChecked();
        await dialog.getByRole('button', { name: 'Close', exact: true }).click();
        await expectClosed(page);
        expect(writes).toEqual([]);
        expect(await readUsers()).toEqual(before);
    });

    for (const key of ['Enter', 'Space']) {
        test(`Add, Edit, Close, and Cancel work with ${key} without saving`, async ({ page }, testInfo) => {
            await page.setViewportSize({ width: 390, height: 844 });
            await page.goto('/userRoles');
            const userRow = page.getByRole('row').filter({ hasText: fixtureEmail });
            await expect(userRow).toBeVisible();
            const before = await readUsers();
            const writes = monitorWrites(page);
            const add = page.getByRole('button', { name: 'Add User Role', exact: true });
            await add.focus();
            await page.keyboard.press('Tab');
            await page.keyboard.press('Shift+Tab');
            await expect(add).toBeFocused();
            await expect(add).toHaveCSS('outline-width', '2px');
            await expect(add).toBeInViewport({ ratio: 1 });
            await page.keyboard.press(key);
            let opened = await readyDialog(page, 'Add New User');
            await opened.getByLabel('Full Name', { exact: true }).fill('Unsaved close draft');
            await opened.getByRole('button', { name: 'Close', exact: true }).focus();
            await page.keyboard.press(key);
            await expectClosed(page);

            const edit = userRow.getByRole('button', { name: 'Edit user', exact: true });
            await edit.focus();
            await page.keyboard.press(key);
            opened = await readyDialog(page, 'Edit User');
            await expect(opened.getByLabel('Full Name', { exact: true })).toHaveValue(fixture.name);
            await expect(opened.getByLabel('Email Address', { exact: true })).toHaveValue(fixtureEmail);
            await expect(opened.getByLabel('Email Address', { exact: true })).toBeDisabled();
            await opened.getByLabel('Full Name', { exact: true }).fill('Unsaved close edit');
            await opened.getByRole('button', { name: 'Close', exact: true }).focus();
            await page.keyboard.press(key);
            await expectClosed(page);

            await add.click();
            const dialog = await readyDialog(page, 'Add New User');
            await expect(dialog.getByLabel('Full Name', { exact: true })).toHaveValue('');
            const cancel = dialog.getByRole('button', { name: 'Cancel', exact: true });
            await dialog.getByRole('button', { name: 'Create User', exact: true }).focus();
            await page.keyboard.press('Shift+Tab');
            await expect(cancel).toBeFocused();
            await expect(cancel).toHaveCSS('outline-width', '2px');
            await expect(cancel).toBeInViewport({ ratio: 1 });
            await testInfo.attach('manage-users-cancel-mobile', { body: await page.screenshot(), contentType: 'image/png' });
            await page.keyboard.press(key);
            await expectClosed(page);
            expect(writes).toEqual([]);
            expect(await readUsers()).toEqual(before);
        });
    }

    test('combined roles preserve compatible access, prune conflicts, handle legacy admin and cancel drafts', async ({ page }) => {
        await seedUserInEmulator(fixtureEmail, {
            email: fixtureEmail, name: fixture.name, role: 'admin', userRoles: ['teacher'],
        });
        await seedUserInEmulator(extraRoleFixture.email, {
            ...extraRoleFixture, userRoles: ['coach', 'admin'],
            tutorCoverage: [{ key: 'course:ui-check', type: 'course', id: 'ui-check', label: 'Saved UI Coverage' }],
            tutorCoverageKeys: ['course:ui-check'],
        });
        await page.goto('/userRoles');
        const extra = page.getByRole('row').filter({ hasText: extraRoleFixture.email });
        await expect(extra).toBeVisible();
        const before = await readUsers(); const writes = monitorWrites(page);
        await extra.getByRole('button', { name: 'Edit user', exact: true }).click();
        let dialog = await readyDialog(page, 'Edit User');
        await expect(rolesField(dialog)).toContainText('Tutor');
        await expect(rolesField(dialog)).toContainText('Coach');
        await expect(rolesField(dialog)).toContainText('Admin');
        await roleControl(dialog).click();
        expect(await page.getByRole('option').allTextContents()).toEqual(['Student', 'Teacher']);
        await page.keyboard.press('Escape'); await expect(dialog).toBeVisible();
        await expect(roleControl(dialog)).toBeFocused();
        await expect(dialog.getByText('Saved UI Coverage', { exact: true })).toBeVisible();
        await dialog.getByRole('button', { name: 'Remove Tutor', exact: true }).click();
        await expect(dialog.getByLabel('Tutor Class Coverage', { exact: true })).toHaveCount(0);
        await selectRole(page, dialog, 'tutor');
        await expect(dialog.getByText('Saved UI Coverage', { exact: true })).toHaveCount(0);
        await expect(rolesField(dialog)).toContainText('Coach');
        await selectRole(page, dialog, 'teacher');
        await expect(rolesField(dialog)).toContainText('Admin');
        await expect(dialog.getByRole('button', { name: 'Remove Coach', exact: true })).toHaveCount(0);
        await expect(dialog.getByRole('button', { name: 'Remove Tutor', exact: true })).toHaveCount(0);
        await expect(dialog.getByRole('switch', { name: 'Tutoring request notifications', exact: true })).toBeVisible();
        await selectRole(page, dialog, 'student');
        await expect(rolesField(dialog)).toContainText('Student');
        await expect(dialog.getByRole('button', { name: 'Remove Admin', exact: true })).toHaveCount(0);
        await selectRole(page, dialog, 'teacher');
        for (const width of [390, 320]) {
            await page.setViewportSize({ width, height: 844 });
            await expect(roleControl(dialog)).toBeInViewport({ ratio: 1 });
        }
        await dialog.getByRole('button', { name: 'Cancel', exact: true }).click(); await expectClosed(page);
        await page.getByRole('row').filter({ hasText: fixtureEmail }).getByRole('button', { name: 'Edit user', exact: true }).click();
        dialog = await readyDialog(page, 'Edit User');
        await expect(rolesField(dialog)).toContainText('Admin'); await expect(rolesField(dialog)).toContainText('Teacher');
        await selectRole(page, dialog, 'tutor');
        await expect(dialog.getByRole('button', { name: 'Remove Teacher', exact: true })).toHaveCount(0);
        await expect(rolesField(dialog)).toContainText('Admin');
        await dialog.getByRole('button', { name: 'Cancel', exact: true }).click(); await expectClosed(page);
        expect(writes).toEqual([]); expect(await readUsers()).toEqual(before);
    });

    test('combined roles save the main view and exact additional access and reject an empty selection', async ({ page }) => {
        await seedUserInEmulator(extraRoleFixture.email, extraRoleFixture);
        await page.route('**/api/canvas/tutor-eligibility/rebuild', route => route.fulfill({ json: { status: 'success' } }));
        await page.goto('/userRoles');
        const row = page.getByRole('row').filter({ hasText: extraRoleFixture.email });
        await row.getByRole('button', { name: 'Edit user', exact: true }).click();
        let dialog = await readyDialog(page, 'Edit User');
        // Adding Coach must retain the Tutor main view and existing Admin access.
        await selectRole(page, dialog, 'coach');
        await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click(); await expectClosed(page);
        let saved = (await readUsers()).find(user => user.name.endsWith(`/${extraRoleFixture.email}`)).fields;
        expect(saved.defaultRole.stringValue).toBe('tutor'); expect(saved.role.stringValue).toBe('tutor');
        expect(saved.userRoles.arrayValue.values.map(value => value.stringValue)).toEqual(['admin', 'coach']);
        await page.reload(); await row.getByRole('button', { name: 'Edit user', exact: true }).click();
        dialog = await readyDialog(page, 'Edit User');
        await expect(rolesField(dialog)).toContainText('Coach');
        await dialog.getByRole('button', { name: 'Remove Tutor', exact: true }).click();
        await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click(); await expectClosed(page);
        saved = (await readUsers()).find(user => user.name.endsWith(`/${extraRoleFixture.email}`)).fields;
        expect(saved.defaultRole.stringValue).toBe('coach'); expect(saved.userRoles.arrayValue.values.map(value => value.stringValue)).toEqual(['admin']);
        // The modal closes before the asynchronous table refresh; reopen the updated row.
        await expect(row.getByText('TUTOR', { exact: true })).toHaveCount(0);
        await row.getByRole('button', { name: 'Edit user', exact: true }).click(); dialog = await readyDialog(page, 'Edit User');
        await dialog.getByRole('button', { name: 'Remove Coach', exact: true }).click();
        await dialog.getByRole('button', { name: 'Remove Admin', exact: true }).click();
        await expect(dialog.getByRole('button', { name: 'Save Changes', exact: true })).toBeDisabled();
        const before = await readUsers();
        await dialog.getByLabel('Full Name', { exact: true }).press('Enter'); await expect(dialog).toBeVisible();
        expect(await readUsers()).toEqual(before);
        await selectRole(page, dialog, 'student');
        await expect(dialog.getByRole('button', { name: 'Save Changes', exact: true })).toBeEnabled();
        await dialog.getByRole('button', { name: 'Cancel', exact: true }).click(); expect(await readUsers()).toEqual(before);
    });

    test('modal keeps outside clicks inert and Escape discards drafts and restores focus', async ({ page }) => {
        await page.goto('/userRoles');
        await expect(page.getByRole('row').filter({ hasText: fixtureEmail })).toBeVisible();
        const before = await readUsers();
        const writes = monitorWrites(page);
        const add = page.getByRole('button', { name: 'Add User Role', exact: true });
        await add.click();
        let dialog = await readyDialog(page, 'Add New User');
        await dialog.getByLabel('Full Name', { exact: true }).fill('Unsaved escape draft');
        await page.mouse.click(1, 1);
        await expect(dialog).toBeVisible();
        await dialog.getByLabel('Full Name', { exact: true }).focus();
        await page.keyboard.press('Escape');
        await expectClosed(page);
        await expect(add).toBeFocused();
        await page.keyboard.press('Enter');
        dialog = await readyDialog(page, 'Add New User');
        await expect(dialog.getByLabel('Full Name', { exact: true })).toHaveValue('');
        await dialog.getByRole('button', { name: 'Close', exact: true }).click();
        await expectClosed(page);
        expect(writes).toEqual([]);
        expect(await readUsers()).toEqual(before);
    });

    test('complete modal menus and conditional controls work on a small screen and save coverage correctly', async ({ page }) => {
        await seedUserInEmulator(extraRoleFixture.email, extraRoleFixture);
        await seedCanvasCourseInEmulator('ui-coverage-one', { name: 'UI Coverage One', courseCode: 'UI-ONE' });
        await seedCanvasCourseInEmulator('ui-coverage-two', { name: 'UI Coverage Two', courseCode: 'UI-TWO' });
        await page.route('**/api/canvas/tutor-eligibility/rebuild', route => route.fulfill({ json: { status: 'success' } }));
        await page.setViewportSize({ width: 390, height: 700 });
        await page.goto('/userRoles');
        const row = page.getByRole('row').filter({ hasText: extraRoleFixture.email });
        await expect(row).toBeVisible();
        await row.getByRole('button', { name: 'Edit user', exact: true }).click();
        let dialog = await readyDialog(page, 'Edit User');
        let role = roleControl(dialog);
        await role.focus();
        await page.keyboard.press('Space');
        await expect(page.getByRole('option', { name: 'Teacher', exact: true })).toBeVisible();
        await page.getByRole('searchbox', { name: 'Search Roles', exact: true }).fill('Teacher');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        await expect(rolesField(dialog)).toContainText('Teacher');
        await expect(dialog).toBeVisible();
        const notification = dialog.getByRole('switch', { name: 'Tutoring request notifications', exact: true });
        const originalNotification = await notification.isChecked();
        await notification.focus();
        await page.keyboard.press('Space');
        expect(await notification.isChecked()).toBe(!originalNotification);
        await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
        await expectClosed(page);
        const teacherSaved = (await readUsers()).find(user => user.name.endsWith(`/${extraRoleFixture.email}`)).fields;
        expect(teacherSaved.requestNotificationsEnabled.booleanValue).toBe(!originalNotification);
        await row.getByRole('button', { name: 'Edit user', exact: true }).click();
        dialog = await readyDialog(page, 'Edit User');
        role = roleControl(dialog);
        expect(await dialog.getByRole('switch', { name: 'Tutoring request notifications', exact: true }).isChecked()).toBe(!originalNotification);
        await selectRole(page, dialog, 'coach');
        await roleControl(dialog).click();
        await page.getByRole('searchbox', { name: 'Search Roles', exact: true }).fill('Tutor');
        await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
        await expect(rolesField(dialog)).toContainText('Tutor');
        const coverage = dialog.getByRole('button', { name: 'Tutor Class Coverage', exact: true });
        await coverage.click();
        const coverageSearch = page.getByRole('searchbox', { name: 'Search Tutor Class Coverage', exact: true });
        await coverageSearch.fill('no-such-course');
        await expect(page.getByText('No matching Canvas courses', { exact: true })).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(dialog).toBeVisible();
        for (const label of ['One', 'Two']) {
            await coverage.click(); await coverageSearch.fill(`UI Coverage ${label}`);
            const option = page.getByRole('option', { name: `UI Coverage ${label} (UI-${label.toUpperCase()})`, exact: true });
            await expect(option).toBeInViewport({ ratio: 1 });
            // Portalled options must remain inside the active dialog overlay.
            expect(await option.evaluate(el => !!el.closest('[data-untitled-modal-overlay]'))).toBe(true);
            await option.click();
        }
        await expect(dialog.getByText('UI Coverage One (UI-ONE)', { exact: true })).toBeVisible();
        await expect(dialog.getByText('UI Coverage Two (UI-TWO)', { exact: true })).toBeVisible();
        const save = dialog.getByRole('button', { name: 'Save Changes', exact: true });
        await expect(save).toBeInViewport({ ratio: 1 });
        await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeInViewport({ ratio: 1 });
        await save.click();
        await expectClosed(page);
        let saved = (await readUsers()).find(user => user.name.endsWith(`/${extraRoleFixture.email}`)).fields;
        expect(saved.defaultRole.stringValue).toBe('coach');
        expect(saved.userRoles.arrayValue.values.map(value => value.stringValue)).toEqual(['admin', 'tutor']);
        expect(saved.tutorCoverageKeys.arrayValue.values.map(value => value.stringValue)).toEqual(['course:ui-coverage-one', 'course:ui-coverage-two']);
        await row.getByRole('button', { name: 'Edit user', exact: true }).click();
        dialog = await readyDialog(page, 'Edit User');
        await expect(dialog.getByText('UI Coverage Two (UI-TWO)', { exact: true })).toBeVisible();
        await dialog.getByRole('button', { name: 'Remove Tutor', exact: true }).click();
        await expect(dialog.getByRole('button', { name: 'Remove Tutor', exact: true })).toHaveCount(0);
        await expect(dialog.getByRole('button', { name: 'Tutor Class Coverage', exact: true })).toHaveCount(0);
        await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
        await expectClosed(page);
        saved = (await readUsers()).find(user => user.name.endsWith(`/${extraRoleFixture.email}`)).fields;
        expect(saved.tutorCoverageKeys.arrayValue.values || []).toEqual([]);
        expect(saved.tutorCoverage.arrayValue.values || []).toEqual([]);
    });

    test('modal text fields preserve native validation, labels, disabled email, and mobile containment', async ({ page }) => {
        await page.goto('/userRoles');
        const row = page.getByRole('row').filter({ hasText: fixtureEmail });
        await expect(row).toBeVisible();
        const before = await readUsers();
        const writes = monitorWrites(page);
        await page.getByRole('button', { name: 'Add User Role', exact: true }).click();
        let dialog = await readyDialog(page, 'Add New User');
        const email = dialog.getByLabel('Email Address', { exact: true });
        const name = dialog.getByLabel('Full Name', { exact: true });
        await expect(email).toHaveAttribute('type', 'email');
        for (const field of [email, name]) {
            await expect(field).toHaveAttribute('required', '');
            await expect(field).toHaveValue('');
            expect(await field.evaluate(el => el.validity.valueMissing)).toBe(true);
            await expect(field.locator('..')).toHaveCSS('border-radius', '8px');
        }
        await dialog.getByText('Email Address', { exact: true }).click();
        await expect(email).toBeFocused();
        await email.fill('invalid-email');
        await name.fill('Validation Check');
        expect(await email.evaluate(el => el.validity.typeMismatch)).toBe(true);
        await dialog.getByRole('button', { name: 'Create User', exact: true }).click();
        await expect(dialog).toBeVisible();
        await expect(email).toBeFocused();
        await email.fill('valid@example.edu');
        await name.fill('');
        await dialog.getByRole('button', { name: 'Create User', exact: true }).click();
        await expect(name).toBeFocused();
        await expect(dialog).toBeVisible();
        for (const width of [390, 320]) {
            await page.setViewportSize({ width, height: 844 });
            await expect(email).toBeInViewport({ ratio: 1 });
            await expect(name).toBeInViewport({ ratio: 1 });
        }
        await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
        await expectClosed(page);
        await row.getByRole('button', { name: 'Edit user', exact: true }).click();
        dialog = await readyDialog(page, 'Edit User');
        await expect(dialog.getByLabel('Email Address', { exact: true })).toBeDisabled();
        await expect(dialog.getByLabel('Email Address', { exact: true })).toHaveValue(fixtureEmail);
        await expect(dialog.getByLabel('Full Name', { exact: true })).toHaveValue(fixture.name);
        await dialog.getByRole('button', { name: 'Close', exact: true }).focus();
        await page.keyboard.press('Tab');
        await expect(dialog.getByLabel('Full Name', { exact: true })).toBeFocused();
        await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
        await expectClosed(page);
        expect(writes).toEqual([]);
        expect(await readUsers()).toEqual(before);
    });

    test('action buttons preserve validation, create/edit saves, delete requests, and timesheet upload', async ({ page }) => {
        await seedUserInEmulator(extraRoleFixture.email, extraRoleFixture);
        // Exercise main's secured account API on these owned demo fixtures.
        let rebuilds = 0;
        await page.route('**/api/canvas/tutor-eligibility/rebuild', route => {
            rebuilds++;
            return route.fulfill({ json: { status: 'success' } });
        });
        const deletions = [];
        let deleteFails = true;
        await page.route('**/api/users', route => {
            if (route.request().method() !== 'DELETE') return route.continue();
            expect(route.request().method()).toBe('DELETE');
            deletions.push(route.request().postDataJSON());
            return route.fulfill({ status: deleteFails ? 500 : 200, json: { message: 'UI fixture delete check' } });
        });
        await page.goto('/userRoles');
        const first = page.getByRole('row').filter({ hasText: fixtureEmail });
        await expect(first).toBeVisible();
        const before = await readUsers();
        await page.getByRole('button', { name: 'Add User Role', exact: true }).click();
        let dialog = await readyDialog(page, 'Add New User');
        const create = dialog.getByRole('button', { name: 'Create User', exact: true });
        await expect(create).toHaveAttribute('type', 'submit');
        await expect(create).toHaveCSS('border-radius', '8px');
        await create.click();
        await expect(dialog).toBeVisible();
        expect(await readUsers()).toEqual(before);
        expect(rebuilds).toBe(0);
        await dialog.getByLabel('Email Address', { exact: true }).fill(createdEmail);
        await dialog.getByLabel('Full Name', { exact: true }).fill('Created UI Check');
        await create.focus();
        await page.keyboard.press('Enter');
        await expectClosed(page);
        const created = page.getByRole('row').filter({ hasText: createdEmail });
        await expect(created).toContainText('Created UI Check');
        expect(rebuilds).toBe(0);

        await first.getByRole('button', { name: 'Edit user', exact: true }).click();
        dialog = await readyDialog(page, 'Edit User');
        await dialog.getByLabel('Full Name', { exact: true }).fill('Saved UI Edit');
        await dialog.getByRole('button', { name: 'Save Changes', exact: true }).focus();
        await page.keyboard.press('Space');
        await expectClosed(page);
        await expect(first).toContainText('Saved UI Edit');
        expect(rebuilds).toBe(0);
        const saved = await readUsers();
        expect(saved.filter(user => !user.name.endsWith(`/${fixtureEmail}`) && !user.name.endsWith(`/${createdEmail}`)))
            .toEqual(before.filter(user => !user.name.endsWith(`/${fixtureEmail}`)));

        const extra = page.getByRole('row').filter({ hasText: extraRoleFixture.email });
        const upload = extra.getByRole('button', { name: 'Upload', exact: true });
        await expect(upload).toHaveAttribute('type', 'button');
        await expect(upload).toHaveCSS('border-radius', '8px');
        await upload.focus();
        const chooserPromise = page.waitForEvent('filechooser');
        await page.keyboard.press('Space');
        const chooser = await chooserPromise;
        expect(chooser.isMultiple()).toBe(false);
        await expect(extra.locator('input[type=file]')).toHaveAttribute('accept', '.docx,.pdf');
        const uploadBytes = Buffer.from('%PDF-1.4\nUI migration fixture\n%%EOF');
        await chooser.setFiles({ name: 'ui-check.pdf', mimeType: 'application/pdf', buffer: uploadBytes });
        const readTimesheet = async () => {
            const response = await fetch(`${documents()}/timesheets/${extraRoleFixture.email}`);
            return response.ok ? (await response.json()).fields : null;
        };
        await expect.poll(async () => (await readTimesheet())?.fileName?.stringValue).toBe('ui-check.pdf');
        const timesheet = await readTimesheet();
        expect(timesheet.tutorEmail.stringValue).toBe(extraRoleFixture.email);
        expect(timesheet.fileType.stringValue).toBe('application/pdf');
        expect(timesheet.fileData.stringValue).toBe(`data:application/pdf;base64,${uploadBytes.toString('base64')}`);
        await expect(upload).toBeEnabled();
        expect(await readUsers()).toEqual(saved);

        page.on('dialog', async confirmation => { expect(confirmation.message()).toContain('Delete the app account'); await confirmation.accept(); });
        await expect(first.getByRole('button', { name: 'Delete user', exact: true })).toHaveCSS('border-radius', '8px');
        await first.getByRole('button', { name: 'Delete user', exact: true }).click();
        await expect(page.getByText('Error deleting user. Please try again.', { exact: true })).toBeVisible();
        await expect(first).toBeVisible();
        deleteFails = false;
        await first.getByRole('button', { name: 'Delete user', exact: true }).focus();
        await page.keyboard.press('Enter');
        await expect(first).toHaveCount(0);
        expect(deletions).toEqual([{ email: fixtureEmail }, { email: fixtureEmail }]);
        // The route stub verifies the exact UI request and success/failure handling without deleting an account.
        expect(await readUsers()).toEqual(saved);
    });

    test('table headings keep an opaque background above rows while scrolling', async ({ page }) => {
        await page.goto('/userRoles');
        const region = page.getByRole('region', { name: 'Manage users table', exact: true });
        const headings = page.getByRole('table', { name: 'Manage user roles', exact: true }).getByRole('columnheader');
        await expect(page.getByRole('row').filter({ hasText: fixtureEmail })).toBeVisible();
        for (const width of [1280, 846]) {
            await page.setViewportSize({ width, height: 620 });
            await settleSidebar(page);
            await region.evaluate(el => { el.scrollTop = 0; });
            const before = await headings.evaluateAll(elements => elements.map(el => el.getBoundingClientRect().top));
            await region.focus();
            await page.keyboard.press('PageDown');
            await expect.poll(() => region.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
            await expect.poll(() => headings.evaluateAll(elements => elements.map(el => {
                const style = getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                const context = document.createElement('canvas').getContext('2d');
                context.fillStyle = style.backgroundColor;
                context.fillRect(0, 0, 1, 1);
                return {
                    top: Math.round(rect.top),
                    alpha: context.getImageData(0, 0, 1, 1).data[3],
                    onTop: document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === el,
                };
            }))).toEqual(before.map(top => ({
                top: Math.round(top), alpha: 255, onTop: true,
            })));
        }
    });

    test('icon actions reveal on hover and keyboard focus and stay visible on narrow and touch screens', async ({ page, browser }) => {
        await seedUserInEmulator(extraRoleFixture.email, extraRoleFixture);
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto('/userRoles');
        const row = page.getByRole('row').filter({ hasText: extraRoleFixture.email });
        const edit = row.getByRole('button', { name: 'Edit user', exact: true });
        const actions = edit.locator('..');
        const before = await readUsers(); const writes = monitorWrites(page);
        await row.scrollIntoViewIfNeeded();
        await page.getByRole('heading', { name: 'Manage Users', exact: true }).hover();
        await expect(actions).toHaveCSS('opacity', '0');
        for (const name of ['Upload', 'Edit user', 'Delete user']) {
            const button = row.getByRole('button', { name, exact: true });
            await expect(button).toHaveText('');
            await expect(button).toHaveAttribute('data-icon-only', 'true');
            await expect(button.locator('svg')).toHaveCount(1);
            const bounds = await button.boundingBox(); expect(bounds.width).toBe(32); expect(bounds.height).toBe(32);
        }
        await row.hover(); await expect(actions).toHaveCSS('opacity', '1');
        await page.getByRole('heading', { name: 'Manage Users', exact: true }).hover();
        await expect(actions).toHaveCSS('opacity', '0');
        await edit.focus(); await expect(actions).toHaveCSS('opacity', '1');
        await page.keyboard.press('Tab');
        await expect(row.getByRole('button', { name: 'Delete user', exact: true })).toBeFocused();
        await expect(actions).toHaveCSS('opacity', '1');
        await page.getByRole('textbox', { name: 'Search users', exact: true }).focus();
        await expect(actions).toHaveCSS('opacity', '0');
        await page.setViewportSize({ width: 390, height: 844 });
        await expect(actions).toHaveCSS('opacity', '1');

        // A large touch device must also reveal actions without requiring hover.
        const touch = await browser.newContext({ storageState: await page.context().storageState(),
            hasTouch: true, isMobile: true, viewport: { width: 1024, height: 768 }, baseURL: new URL(page.url()).origin });
        try {
            const touchPage = await touch.newPage(); await touchPage.goto('/userRoles');
            const touchEdit = touchPage.getByRole('row').filter({ hasText: extraRoleFixture.email }).getByRole('button', { name: 'Edit user', exact: true });
            await expect(touchEdit.locator('..')).toHaveCSS('opacity', '1');
            await touchEdit.tap(); const dialog = await readyDialog(touchPage, 'Edit User');
            await dialog.getByRole('button', { name: 'Cancel', exact: true }).tap(); await expectClosed(touchPage);
        } finally { await touch.close(); }
        expect(writes).toEqual([]); expect(await readUsers()).toEqual(before);
    });

    test('user table keeps full details, role badges, row actions, and empty-search recovery usable across screen sizes', async ({ page }) => {
        const longName = 'A Very Long User Name That Must Remain Readable In Full';
        await seedUserInEmulator(extraRoleFixture.email, extraRoleFixture);
        await seedUserInEmulator(createdEmail, { email: createdEmail, name: longName, role: 'coach', defaultRole: 'coach', userRoles: ['tutor', 'admin'] });
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto('/userRoles');
        const row = page.getByRole('row').filter({ hasText: createdEmail });
        await expect(row).toBeVisible();
        const before = await readUsers();
        const writes = monitorWrites(page);
        const order = await page.getByRole('row').allTextContents();
        const region = page.getByRole('region', { name: 'Manage users table', exact: true });
        await page.evaluate(() => document.fonts.ready);
        await expect(page.getByRole('table', { name: 'Manage user roles', exact: true }).getByRole('columnheader')).toHaveCount(3);
        for (const width of [1280, 846, 390, 320]) {
            await page.setViewportSize({ width, height: 900 });
            await settleSidebar(page);
            expect(await page.getByRole('row').allTextContents()).toEqual(order);
            await expect.poll(() => region.evaluate(el => el.scrollWidth - el.clientWidth),
                { message: `Table overflow at ${width}px` }).toBeLessThanOrEqual(1);
            for (const text of [longName, createdEmail]) {
                const field = row.getByText(text, { exact: true });
                await expect(field).toHaveText(text);
                const layout = await field.evaluate(el => ({ whiteSpace: getComputedStyle(el).whiteSpace, width: el.clientWidth, content: el.scrollWidth }));
                expect(layout.whiteSpace).toBe('normal');
                expect(layout.content).toBeLessThanOrEqual(layout.width + 1);
            }
            for (const name of ['Upload', 'Edit user', 'Delete user']) {
                const button = row.getByRole('button', { name, exact: true });
                await button.focus();
                await expect(button).toBeInViewport({ ratio: 1 });
            }
        }
        await expect(row.getByText('COACH', { exact: true })).toBeVisible();
        await expect(row.getByText('TUTOR', { exact: true })).toBeVisible();
        await expect(row.getByText('ADMIN', { exact: true })).toBeVisible();
        await expect(page.getByRole('row').filter({ hasText: fixtureEmail }).getByRole('button', { name: 'Upload', exact: true })).toHaveCount(0);
        await region.evaluate(el => { el.scrollTop = 0; });
        await region.focus();
        await page.keyboard.press('PageDown');
        await expect.poll(() => region.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
        const search = page.getByRole('textbox', { name: 'Search users', exact: true });
        await search.fill('unique-no-table-results');
        await expect(page.getByRole('status')).toHaveText(/No matching users/);
        await expect(page.getByText(`0 of ${before.length} users`, { exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Clear search', exact: true }).click();
        await expect(search).toHaveValue('');
        await expect(row).toBeVisible();
        expect(await page.getByRole('row').allTextContents()).toEqual(order);
        expect(writes).toEqual([]);
        expect(await readUsers()).toEqual(before);
    });

    test('search preserves name/email/role filtering and the template downloads unchanged', async ({ page }) => {
        await seedUserInEmulator(extraRoleFixture.email, extraRoleFixture);
        await page.goto('/userRoles');
        const first = page.getByRole('row').filter({ hasText: fixtureEmail });
        const extra = page.getByRole('row').filter({ hasText: extraRoleFixture.email });
        await expect(first).toBeVisible();
        await expect(extra).toBeVisible();
        const before = await readUsers();
        const rowsBefore = await page.getByRole('row').allTextContents();
        const writes = monitorWrites(page);
        const search = page.getByRole('textbox', { name: 'Search users', exact: true });
        await search.focus();
        await page.keyboard.type('cAnCeL cHeCk tEaChEr');
        await expect(first).toBeVisible();
        await expect(extra).toHaveCount(0);
        await search.fill(fixtureEmail.toUpperCase());
        await expect(first).toBeVisible();
        await expect(extra).toHaveCount(0);
        for (const query of ['tUtOr', 'aDmIn']) {
            await search.fill(query);
            await expect(extra).toBeVisible();
            await expect(first).toHaveCount(0);
        }
        for (const query of ['unique-search-no-match-82641', '   ']) {
            await search.fill(query);
            await expect(first).toHaveCount(0);
            await expect(extra).toHaveCount(0);
        }
        await search.fill('');
        await expect(first).toBeVisible();
        await expect(extra).toBeVisible();
        expect(await page.getByRole('row').allTextContents()).toEqual(rowsBefore);
        await search.focus();
        await page.keyboard.press('Tab');
        await expect(page.getByRole('link', { name: 'Timesheet Template', exact: true })).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(page.getByRole('button', { name: 'Add User Role', exact: true })).toBeFocused();

        const template = page.getByRole('link', { name: 'Timesheet Template', exact: true });
        await expect(template).toHaveAttribute('href', '/api/download-template');
        await expect(template).toHaveAttribute('download', 'Timesheet_Template.docx');
        await expect(template).toHaveCSS('text-decoration-line', 'none');
        for (const width of [390, 320]) {
            await page.setViewportSize({ width, height: 844 });
            await settleSidebar(page);
            await expect(search).toBeInViewport({ ratio: 1 });
            const sizing = await search.evaluate(el => {
                const toolbar = el.closest('[data-untitled-input]').parentElement.parentElement;
                const css = getComputedStyle(toolbar);
                return { input: el.getBoundingClientRect().width, toolbar: toolbar.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight) };
            });
            expect(sizing.input).toBeGreaterThanOrEqual(Math.min(250, sizing.toolbar) - 1);
            await expect(template).toBeInViewport({ ratio: 1 });
        }
        await template.focus();
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.keyboard.press('Enter'),
        ]);
        expect(download.suggestedFilename()).toBe('Timesheet_Template.docx');
        const downloaded = await readFile(await download.path());
        expect(downloaded.equals(await readFile('docs/timesheetTemplate.docx'))).toBe(true);
        await expect(page).toHaveURL(/\/userRoles$/);
        expect(writes).toEqual([]);
        expect(await readUsers()).toEqual(before);
    });
});
