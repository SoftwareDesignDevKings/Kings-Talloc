import { test, expect } from '@playwright/test';
import { seedShiftInEmulator, seedStudentRequestInEmulator, seedUserInEmulator, seedStudentEligibilityInEmulator, confirmAction } from './wrapperFunctions';

test.use({ timezoneId: 'Australia/Sydney' });
const prefix = 'Dashboard UI Check ';
const tutor = 'ui-dashboard-tutor@example.edu';
const ids = ['ui-dashboard-approve', 'ui-dashboard-reject', 'ui-dashboard-delete'];
const eventTitle = prefix + 'event with details';
let eventData;
const roles = {
    'admin-tests': ['Upcoming Events', 'Pending Approvals', 'Tutors In Today', 'Total Allocated Hours', 'Completed Hours', 'Allocated Hours (Next Week)'],
    'tutorAdmin-tests': ['Upcoming Events', 'Pending Approvals', 'Tutors In Today', 'Total Allocated Hours', 'Completed Hours', 'Allocated Hours (Next Week)'],
    'teacher-tests': ['Pending Approvals', 'Student Tutor Sessions', 'Uncompleted Tutor Sessions', 'Tutors on My Students'],
    'tutor-tests': ['Upcoming Sessions', 'Scheduled Hours', 'Uncompleted Shifts', 'Students Helped'],
    'student-tests': ['Upcoming Sessions', 'Scheduled Hours', 'Pending Requests', 'Approved Requests'],
    'coach-tests': ['Upcoming Sessions', 'Scheduled Hours', 'Uncompleted Shifts', 'Students Helped'], 'coachTutor-tests': ['Upcoming Sessions', 'Scheduled Hours', 'Uncompleted Shifts', 'Students Helped'],
};
const documents = () => {
    const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const host = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
    if (!project?.startsWith('demo-') || !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) throw new Error('Dashboard checks require local demo emulators.');
    return `http://${host}/v1/projects/${project}/databases/(default)/documents`;
};
const read = async path => {
    const response = await fetch(`${documents()}/${path}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Cannot read dashboard fixture: ${response.status}`);
    return response.json();
};
const remove = async path => {
    const response = await fetch(`${documents()}/${path}`, { method: 'DELETE' });
    if (!response.ok) throw new Error(`Cannot remove dashboard fixture: ${response.status}`);
};
const patchWelcome = async fields => {
    const response = await fetch(`${documents()}/users/student@kings.edu.au?updateMask.fieldPaths=hasSeenWelcome`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }),
    });
    if (!response.ok) throw new Error('Cannot prepare/restore demo welcome preference.');
};
const request = (id, offset) => {
    const start = new Date(Date.now() + (3 + offset) * 3600000);
    return { title: prefix + id, start, end: new Date(+start + 1800000), createdAt: new Date(),
        createdByStudent: true, isStudentRequest: true, approvalStatus: 'pending', recurring: null,
        staff: [{ value: tutor, label: 'Dashboard Fixture Tutor' }], students: [{ value: 'student@kings.edu.au', label: 'Dashboard Fixture Student' }],
        staffEmails: [tutor], studentEmails: ['student@kings.edu.au'], emailsList: [tutor, 'student@kings.edu.au'],
        classes: [{ label: 'Dashboard fixture class' }], workType: 'tutoring', workStatus: 'notCompleted',
    };
};
let originalWelcome;
test.beforeEach(async ({ page }, info) => {
    documents();
    await seedUserInEmulator(tutor, { email: tutor, name: 'Dashboard Fixture Tutor', defaultRole: 'tutor', userRoles: [] });
    await seedStudentEligibilityInEmulator('student@kings.edu.au', [tutor, 'tutor@kings.edu.au']);
    const start = new Date(Date.now() + 3600000);
    eventData = {
        title: eventTitle, start, end: new Date(+start + 3600000), recurring: null,
        workType: 'coaching', workStatus: 'notCompleted', createdByStudent: true, approvalStatus: 'approved',
        description: 'Dashboard fixture description\nSecond line',
        staff: [{ value: 'tutor@kings.edu.au', label: 'Dashboard Event Tutor' }], students: [{ value: 'student@kings.edu.au', label: 'Dashboard Fixture Student' }],
        emailsList: ['tutor@kings.edu.au', 'tutorAdmin@kings.edu.au', 'coach@kings.edu.au', 'coachTutor@kings.edu.au', 'student@kings.edu.au'],
    };
    await seedShiftInEmulator('ui-dashboard-event', eventData);
    for (const [index, id] of ids.entries()) await seedStudentRequestInEmulator(id, request(id, index));
    if (info.project.name === 'student-tests') {
        const student = await read('users/student@kings.edu.au');
        originalWelcome = student.fields.hasSeenWelcome;
        await patchWelcome({ hasSeenWelcome: { booleanValue: true } });
    }
    // These UI tests never send real notifications or create external meetings.
    await page.route('**/api/send-emails', route => route.fulfill({ json: { message: 'Dashboard fixture notifications sent' } }));
    await page.route('**/api/microsoft?*', route => route.fulfill({ json: { data: { teamsEventId: 'ui-dashboard-meeting', joinUrl: 'https://example.invalid/dashboard-fixture' } } }));
});
test.afterEach(async ({}, info) => {
    for (const id of ids) await remove(`studentEventRequests/${id}`);
    await remove(`users/${tutor}`);
    await remove('shifts/ui-dashboard-event');
    await remove('shifts/ui-dashboard-conflict');
    await remove(`tutorBookingGuards/${encodeURIComponent(tutor)}`);
    for (const collection of ['shifts', 'emailNotifications']) {
        const snapshot = await read(`${collection}?pageSize=1000`);
        if (snapshot?.nextPageToken) throw new Error('Cannot safely enumerate dashboard fixture cleanup.');
        for (const doc of snapshot?.documents || []) {
            if (doc.fields?.title?.stringValue?.startsWith(prefix)) await remove(`${collection}/${doc.name.split('/').pop()}`);
        }
    }
    if (info.project.name === 'student-tests') await patchWelcome(originalWelcome ? { hasSeenWelcome: originalWelcome } : {});
});
const queueButton = page => page.getByRole('button', { name: /^Pending Approvals (?:\d+|…)$/ });
const openQueue = async page => {
    const trigger = queueButton(page);
    await expect(trigger).toBeVisible();
    if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
};

test.describe('Dashboard roles @teacherAdmin @tutorAdmin @teacherOnly @tutorOnly @coachOnly @coachTutor @studentOnly', () => {
    test('retains role-specific cards, event details, badges and email-action visibility', async ({ page }, info) => {
        await page.goto('/dashboard');
        for (const title of roles[info.project.name]) await expect(page.getByRole('heading', { name: title, exact: true }).first()).toBeVisible();
        await expect(page.getByText(eventTitle, { exact: true }).first()).toBeVisible();
        await expect(page.getByText('Dashboard fixture description Second line', { exact: true }).first()).toBeVisible();
        await expect(page.getByText('Coaching', { exact: true }).first()).toBeVisible();
        if (['admin-tests', 'tutorAdmin-tests', 'teacher-tests', 'student-tests'].includes(info.project.name)) await expect(page.getByText('Approved', { exact: true }).first()).toBeVisible();
        else await expect(page.getByText('Approved', { exact: true })).toHaveCount(0);
        await expect(page.getByRole('heading', { name: /^(Events for Today|Today's Sessions)$/ })).toBeVisible();
        if (['admin-tests', 'tutorAdmin-tests'].includes(info.project.name)) {
            await expect(page.getByRole('button', { name: 'Email Shift Notifications', exact: true })).toBeVisible();
        } else await expect(page.getByRole('button', { name: /Email Shift Notifications/ })).toHaveCount(0);
        if (info.project.name === 'teacher-tests') {
            await openQueue(page);
            await expect(page.getByRole('button', { name: 'Approve', exact: true })).toHaveCount(ids.length);
            await expect(page.getByRole('button', { name: 'Approve', exact: true }).first()).toBeEnabled();
            await expect(page.getByRole('button', { name: 'Reject', exact: true })).toHaveCount(ids.length);
        }
    });
});

test.describe('Dashboard admin actions @teacherAdmin @tutorAdmin', () => {
    test('long cards, event details, approval menus and reauthentication fit desktop and phone layouts', async ({ page }) => {
        const longTitle = prefix + 'A long event title with a long word ' + 'W'.repeat(80);
        await seedShiftInEmulator('ui-dashboard-event', { ...eventData, title: longTitle, description: 'A long description\n' + 'D'.repeat(120) });
        await seedStudentRequestInEmulator(ids[0], { ...request(ids[0], 0), title: prefix + 'R'.repeat(120) });
        await page.goto('/dashboard');
        const section = page.locator('[class*="dashboard_section"]');
        await expect(page.getByText(longTitle, { exact: true }).first()).toBeVisible();
        for (const width of [1280, 1003, 846, 390, 320]) {
            await page.setViewportSize({ width, height: 740 });
            await expect.poll(() => section.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
            for (const title of await page.getByText(longTitle, { exact: true }).all()) {
                expect(await title.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
            }
            const trigger = queueButton(page);
            await trigger.focus();
            await page.keyboard.press('Enter');
            const dialog = page.getByRole('dialog', { name: 'Pending Approvals', exact: true });
            await expect(dialog).toBeVisible();
            await expect.poll(() => dialog.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
            const box = await dialog.boundingBox();
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(width);
            await dialog.getByRole('button', { name: 'Approve', exact: true }).first().focus();
            const buttons = await dialog.getByRole('button').count();
            for (let index = 1; index < buttons; index++) await page.keyboard.press('Tab');
            const last = dialog.getByRole('button', { name: 'Delete', exact: true }).last();
            await expect(last).toBeFocused();
            await expect(last, `Last request action at ${width}px`).toBeInViewport({ ratio: 1 });
            await page.keyboard.press('Escape');
            await expect(dialog).toHaveCount(0);
            await expect(trigger).toBeFocused();
        }
        await page.route('**/api/send-emails', route => route.fulfill({ status: 401, json: { error: 'REAUTH_REQUIRED' } }));
        const email = page.getByRole('button', { name: 'Email Shift Notifications', exact: true });
        await email.click();
        const reauth = page.getByRole('dialog', { name: 'Microsoft Session Expired', exact: true });
        await expect(reauth).toBeVisible();
        await expect.poll(() => reauth.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
        await page.keyboard.press('Escape');
        await expect(reauth).toHaveCount(0);
        await expect(email).toBeFocused();
        await expect(page.locator('.modal-backdrop')).toHaveCount(0);
        await expect(page.locator('body')).not.toHaveClass(/modal-open/);
    });

    test('rapid navigation during card appearance and popup teardown produces no page errors', async ({ page }) => {
        const errors = [];
        page.on('pageerror', error => errors.push(error.stack));
        await page.goto('/dashboard');
        await openQueue(page);
        await page.keyboard.press('Escape');
        for (const destination of ['Canvas Classes', 'Dashboard', 'Manage Users', 'Dashboard', 'Canvas Classes', 'Dashboard']) {
            await page.getByRole('link', { name: destination, exact: true }).click();
            await expect(page).toHaveURL(destination === 'Dashboard' ? '/dashboard' : destination === 'Manage Users' ? '/userRoles' : '/classes');
        }
        await expect(page.getByText(eventTitle, { exact: true }).first()).toBeVisible();
        expect(errors).toEqual([]);
    });

    test('approval detects conflicts and retries, then approve/reject/delete preserve their stored outcomes', async ({ page }) => {
        await page.goto('/dashboard');
        await openQueue(page);
        const item = id => page.getByText(prefix + id, { exact: true }).locator('..').locator('..').locator('..');
        await expect(item(ids[0]).getByRole('button', { name: 'Approve', exact: true })).toBeVisible();
        await seedShiftInEmulator('ui-dashboard-conflict', { ...request(ids[0], 0), title: prefix + 'conflict', approvalStatus: 'approved' });
        await item(ids[0]).getByRole('button', { name: 'Approve', exact: true }).click();
        await expect(page.getByText(/Failed to approve request: Scheduling conflict/)).toBeVisible();
        expect((await read(`studentEventRequests/${ids[0]}`)).fields.approvalStatus.stringValue).toBe('pending');
        await remove('shifts/ui-dashboard-conflict');
        await item(ids[0]).getByRole('button', { name: 'Approve', exact: true }).click();
        await expect(page.getByText('Request approved successfully', { exact: true })).toBeVisible();
        await expect.poll(() => read(`studentEventRequests/${ids[0]}`)).toBeNull();
        const shifts = await read('shifts?pageSize=1000');
        const converted = shifts.documents.find(doc => doc.fields.title?.stringValue === prefix + ids[0]);
        expect(converted.fields.approvalStatus.stringValue).toBe('approved');
        expect(converted.fields.students.arrayValue.values[0].mapValue.fields.value.stringValue).toBe('student@kings.edu.au');
        await expect.poll(async () => (await read('emailNotifications/' + converted.name.split('/').pop()))?.fields.action.stringValue).toBe('allocated');
        await expect.poll(async () => (await read('shifts/' + converted.name.split('/').pop()))?.fields.teamsEventId?.stringValue).toBe('ui-dashboard-meeting');
        await openQueue(page);
        await confirmAction(page, /Reject this request/, () => item(ids[1]).getByRole('button', { name: 'Reject', exact: true }).click());
        await expect.poll(async () => (await read(`studentEventRequests/${ids[1]}`))?.fields.approvalStatus.stringValue).toBe('denied');
        await openQueue(page);
        await confirmAction(page, /Delete/, () => item(ids[2]).getByRole('button', { name: 'Delete', exact: true }).click());
        await expect.poll(() => read(`studentEventRequests/${ids[2]}`)).toBeNull();
    });

    test('email action blocks repeats, reports outcomes, and reauthentication Cancel and sign-in keep their behaviour', async ({ page }) => {
        let finish;
        let calls = 0;
        await page.route('**/api/send-emails', async route => {
            calls++;
            await new Promise(resolve => { finish = resolve; });
            await route.fulfill({ status: 500, json: { message: 'Dashboard fixture notification warning' } });
        });
        await page.goto('/dashboard');
        await page.getByRole('button', { name: 'Email Shift Notifications', exact: true }).click();
        const pending = page.getByRole('button', { name: 'Sending Shift Notifications...', exact: true });
        await expect(pending).toBeDisabled();
        await expect.poll(() => calls).toBe(1);
        await page.keyboard.press('Enter');
        expect(calls).toBe(1);
        finish();
        await expect(page.getByText('Dashboard fixture notification warning', { exact: true })).toBeVisible();
        await page.route('**/api/send-emails', route => route.fulfill({ status: 401, json: { error: 'REAUTH_REQUIRED' } }));
        await page.getByRole('button', { name: 'Email Shift Notifications', exact: true }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog.getByText('Microsoft Session Expired', { exact: true })).toBeVisible();
        await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
        await expect(dialog).toHaveCount(0);
        await page.getByRole('button', { name: 'Email Shift Notifications', exact: true }).click();
        await dialog.getByRole('button', { name: 'Sign in again', exact: true }).click();
        await expect(page).toHaveURL('/login');
    });

    test('pending queue disables stale actions while offline and recovers after reconnecting', async ({ page, context }) => {
        await page.goto('/dashboard');
        await openQueue(page);
        await expect(page.getByText(prefix + ids[0], { exact: true })).toBeVisible();
        await context.setOffline(true);
        await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
        for (const button of await page.getByRole('button', { name: 'Approve', exact: true }).all()) await expect(button).toBeDisabled();
        await context.setOffline(false);
        await expect(page.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Approve', exact: true }).first()).toBeEnabled();
    });
});

test('student welcome keeps its content and Get Started saves the existing preference @studentOnly', async ({ page }) => {
    await patchWelcome({ hasSeenWelcome: { booleanValue: false } });
    await page.goto('/dashboard');
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Welcome to Kings Talloc', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Calendar Color Guide', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Get Started', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect.poll(async () => (await read('users/student@kings.edu.au')).fields.hasSeenWelcome.booleanValue).toBe(true);
});

test('student welcome remains scrollable and its footer works by keyboard on a narrow phone @studentOnly', async ({ page }) => {
    await patchWelcome({ hasSeenWelcome: { booleanValue: false } });
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/dashboard');
    const dialog = page.getByRole('dialog', { name: 'Welcome to Kings Talloc', exact: true });
    await expect(dialog).toBeVisible();
    await expect.poll(() => dialog.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    const start = dialog.getByRole('button', { name: 'Get Started', exact: true });
    await start.focus();
    await expect(start).toBeInViewport({ ratio: 1 });
    await page.keyboard.press('Enter');
    await expect(dialog).toHaveCount(0);
    await expect.poll(async () => (await read('users/student@kings.edu.au')).fields.hasSeenWelcome.booleanValue).toBe(true);
});
