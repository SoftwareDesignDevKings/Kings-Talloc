import { test, expect } from '@playwright/test';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { DateTime } from 'luxon';
import { readFileSync } from 'fs';
import PizZip from 'pizzip';

let env, app, db;
const tutor = 'tutor@kings.edu.au', student = 'student@kings.edu.au';
const slot = DateTime.now().setZone('Australia/Sydney').plus({ days: 1 }).set({ hour: 15, minute: 0, second: 0, millisecond: 0 });
const data = (extra = {}) => ({ title: 'General Work', start: slot.toJSDate(), end: slot.plus({ hours: 3 }).toJSDate(), staff: [{ value: tutor, label: 'Viraj Patel' }], students: [], staffEmails: [tutor], studentEmails: [], emailsList: [tutor], workType: 'work', recurring: null, createdByStudent: false, approvalStatus: 'approved', workStatus: 'notCompleted', ...extra });
const signIn = async (page, label) => { const hydrated = page.waitForResponse(response => response.url().endsWith('/api/auth/session')); await page.goto('/login', { waitUntil: 'domcontentloaded' }); await hydrated; await page.getByRole('button', { name: label, exact: true }).click(); await expect(page).toHaveURL(/dashboard/); await expect(page.getByRole('link', { name: 'Calendar', exact: true })).toBeVisible(); };

test.beforeAll(async () => {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8180';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9199';
    env = await initializeTestEnvironment({ projectId: 'demo-talloc-work-hours', firestore: { host: '127.0.0.1', port: 8180, rules: readFileSync('firebase/firestore.rules', 'utf8') } });
    app = initializeApp({ projectId: 'demo-talloc-work-hours' }, 'work-hours-browser'); db = getFirestore(app);
    for (const email of ['tutor@kings.edu.au', 'student@kings.edu.au', 'teacher@kings.edu.au', 'computing@kings.edu.au', 'mienna@kings.edu.au']) {
        await getAuth(app).updateUser(email, { email }).catch(() => getAuth(app).createUser({ uid: email, email }));
    }
});
test.beforeEach(async () => {
    // This is a dedicated local test project; never clear the other chat's emulator data.
    await env.clearFirestore();
    await db.collection('users').doc('mienna@kings.edu.au').set({ email: 'mienna@kings.edu.au', name: 'Michael Ienna', defaultRole: 'teacher', userRoles: ['admin'], requestNotificationsEnabled: true });
    await db.collection('users').doc(tutor).set({ email: tutor, name: 'Viraj Patel', defaultRole: 'tutor', userRoles: [] });
    await db.collection('users').doc(student).set({ email: student, name: 'John Doe', defaultRole: 'student', userRoles: [], hasSeenWelcome: true, hasSeenCalendarHelp: true });
    await db.collection('studentTutorEligibility').doc(student).set({ eligibleTutorEmails: [tutor], eligibleTutors: [{ email: tutor, subjectCodes: ['MATH'] }] });
});
test.afterAll(async () => { await env?.cleanup(); if (db) await db.terminate(); if (app) await deleteApp(app); });

test('student books during Work, names a group, and teacher approves through the dashboard', async ({ page, browser }) => {
    await db.collection('shifts').doc('work').set(data());
    await signIn(page, 'Student');
    await page.goto(`/calendar?date=${encodeURIComponent(slot.toISO())}`);
    await page.locator('.rbc-events-container').nth(2).click();
    await expect(page.getByLabel('Event start time')).toBeVisible();
    await page.getByLabel('Event start time').fill(slot.plus({ minutes: 30 }).toFormat("yyyy-MM-dd'T'HH:mm"));
    await page.getByLabel('Event end time').fill(slot.plus({ hours: 1 }).toFormat("yyyy-MM-dd'T'HH:mm"));
    await page.getByLabel('Other students (optional)').fill('Alex Example, Casey Example');
    await page.locator('#tutor').click(); await page.getByRole('option', { name: /Viraj Patel/ }).click();
    const save = page.waitForResponse(response => response.url().endsWith('/api/scheduling') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Add Event', exact: true }).click(); expect((await save).status()).toBe(200);
    const pending = await db.collection('studentEventRequests').get(); expect(pending.size).toBe(1); expect(pending.docs[0].data().approvalStatus).toBe('pending');
    expect(pending.docs[0].data().additionalStudents).toEqual(['Alex Example', 'Casey Example']);
    const teacherContext = await browser.newContext(); const teacher = await teacherContext.newPage();
    try {
        await signIn(teacher, 'Teacher');
        await teacher.getByRole('button', { name: /Pending Approvals/ }).click();
        await expect(teacher.getByText('Other students: Alex Example, Casey Example')).toBeVisible();
        const approved = teacher.waitForResponse(response => response.url().endsWith('/api/scheduling') && response.request().method() === 'POST');
        await teacher.getByRole('button', { name: 'Approve', exact: true }).click(); expect((await approved).status()).toBe(200);
        await expect.poll(async () => (await db.collection('shifts').doc(`approved-${pending.docs[0].id}`).get()).exists).toBe(true);
        await page.goto('/dashboard'); await expect(page.getByText('Your tutoring request was approved.')).toBeVisible();
    } finally { await teacherContext.close(); }
});

test('tutor availability has no type selector and saves through the server', async ({ page }) => {
    await signIn(page, 'Tutor'); await page.goto('/calendar'); await page.locator('.rbc-events-container').nth(2).click();
    await expect(page.getByRole('button', { name: 'Add Availability', exact: true })).toBeVisible();
    await expect(page.getByText('Assignment Type', { exact: true })).toHaveCount(0);
    const saved = page.waitForResponse(response => response.url().endsWith('/api/scheduling') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Add Availability', exact: true }).click(); expect((await saved).status()).toBe(200);
});

test('teacher creates Work with no acceptance controls and can mark it completed', async ({ page }) => {
    await db.collection('shifts').doc('work').set(data());
    await signIn(page, 'Teacher'); await page.goto(`/calendar?date=${encodeURIComponent(slot.toISO())}`);
    await page.getByRole('button', { name: /General Work/ }).first().click();
    await page.getByRole('button', { name: 'Settings & Status', exact: true }).click();
    await page.locator('#workType').click(); await expect(page.getByRole('option', { name: 'Tutoring', exact: true })).toHaveCount(0); await page.getByRole('option', { name: 'Work', exact: true }).click();
    await expect(page.getByText('Required for confirmation', { exact: true })).toHaveCount(0);
    await page.locator('#workStatus').click(); await page.getByRole('option', { name: 'Completed', exact: true }).click();
    const saved = page.waitForResponse(response => response.url().endsWith('/api/scheduling') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click(); expect((await saved).status()).toBe(200);
    expect((await db.collection('shifts').doc('work').get()).data().workStatus).toBe('completed');
    await expect(page.getByRole('link', { name: 'Tutor Hours', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Tutor Hours', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Tutor Hours Summary' })).toBeVisible();
});

test('actual Mondays export separately and short shifts warn without blocking download', async ({ page }) => {
    const monday = slot.startOf('week');
    for (const [id, date] of [['one', monday], ['two', monday.plus({ weeks: 1 })]]) await db.collection('shifts').doc(id).set(data({ start: date.set({ hour: 9 }).toJSDate(), end: date.set({ hour: 12 }).toJSDate(), workStatus: 'completed' }));
    await signIn(page, 'Teacher + Admin');
    // Minimal valid weekly DOCX template used only in this emulator project.
    const zip = new PizZip(); zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'); zip.folder('_rels').file('.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.folder('word').file('document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{mondayDate} {mondayCommenced} {mondayFinished} {mondayBreak} {mondayTotal} TOTAL {totalHours}</w:t></w:r></w:p><w:sectPr/></w:body></w:document>');
    await db.collection('timesheets').doc(tutor).set({ fileData: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${zip.generate({ type: 'base64' })}` });
    const response = await page.request.post('/api/timesheet', { data: { tutorEmail: tutor, tutorName: 'Viraj Patel', startDateUTC: monday.toISO(), endDateUTC: monday.plus({ weeks: 1, days: 6 }).toISO(), timesheetType: 'tutor' } });
    expect(response.status()).toBe(200); expect(response.headers()['content-type']).toContain('zip');
    const archive = new PizZip(await response.body()); const files = Object.keys(archive.files).filter(file => file.endsWith('.docx')); expect(files).toHaveLength(2);
    for (const file of files) expect(new PizZip(archive.file(file).asNodeBuffer()).file('word/document.xml').asText()).toContain('TOTAL 3');
    await db.collection('shifts').doc('one').update({ end: monday.set({ hour: 9, minute: 30 }).toJSDate() });
    const short = await page.request.post('/api/timesheet', { data: { tutorEmail: tutor, tutorName: 'Viraj Patel', startDateUTC: monday.toISO(), endDateUTC: monday.plus({ days: 6 }).toISO(), timesheetType: 'tutor' } });
    expect(short.status()).toBe(200); expect(new PizZip(await short.body()).file('word/document.xml').asText()).toContain('Work is under 3 hours');
    await page.goto('/tutorHours'); await expect(page.getByText(/Work is under 3 hours/).first()).toBeVisible();
});


test('two tabs acknowledge only new requests and returning preserves outstanding approvals', async ({ page, context }) => {
    for (let index = 0; index < 2; index++) await db.collection('studentEventRequests').doc(`old-${index}`).set(data({ title: `Existing ${index}`, start: slot.plus({ days: index }).toJSDate(), end: slot.plus({ days: index, hours: 1 }).toJSDate(), students: [{ value: student }], createdByStudent: true, approvalStatus: 'pending', createdAt: new Date(Date.now() - 86400000), emailsList: [tutor, student], studentEmails: [student] }));
    await signIn(page, 'Michael (Notifications)');
    await expect(page.locator('#pending-approvals h3')).toHaveText('2');
    const second = await context.newPage(); await second.goto('/dashboard'); await expect(second.locator('#pending-approvals h3')).toHaveText('2');
    // Chromium automation keeps each target focused on some hosts. Control only the
    // focus signal; snapshots and cross-tab localStorage events remain real.
    const setActive = async (tab, active) => tab.evaluate(active => {
        Object.defineProperty(document, 'hasFocus', { configurable: true, value: () => active });
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => active ? 'visible' : 'hidden' });
        window.dispatchEvent(new Event(active ? 'focus' : 'blur'));
        document.dispatchEvent(new Event('visibilitychange'));
    }, active);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('kings-talloc:request-ack:mienna@kings.edu.au'))).not.toBeNull();
    await setActive(page, false); await setActive(second, false);
    for (let index = 2; index < 5; index++) await db.collection('studentEventRequests').doc(`new-${index}`).set(data({ title: `New ${index}`, start: slot.plus({ days: index }).toJSDate(), end: slot.plus({ days: index, hours: 1 }).toJSDate(), students: [{ value: student }], createdByStudent: true, approvalStatus: 'pending', createdAt: new Date(), emailsList: [tutor, student], studentEmails: [student] }));
    await expect(page).toHaveTitle('(3) Kings-Talloc'); await expect(second).toHaveTitle('(3) Kings-Talloc');
    await setActive(second, true); await expect(second).toHaveTitle('Kings-Talloc'); await expect(page).toHaveTitle('Kings-Talloc');
    await expect(second.locator('#pending-approvals h3')).toHaveText('5');
    await second.locator('#pending-approvals [role="button"]').click();
    const approved = second.waitForResponse(response => response.url().endsWith('/api/scheduling') && response.request().method() === 'POST');
    await second.getByRole('button', { name: 'Approve', exact: true }).first().click(); expect((await approved).status()).toBe(200);
    await expect(second.locator('#pending-approvals h3')).toHaveText('4');
    await second.reload(); await expect(second).toHaveTitle('Kings-Talloc'); await expect(second.locator('#pending-approvals h3')).toHaveText('4');
});
