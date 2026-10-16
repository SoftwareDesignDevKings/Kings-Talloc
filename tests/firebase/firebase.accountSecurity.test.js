const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const fs = require('fs'), path = require('path');
const { seedRuleAccounts } = require('./seedRuleAccounts');
let env;
const admin = 'admin@kings.edu.au', student = 'student@student.kings.edu.au';
const asUser = (email, roles = {}) => env.authenticatedContext(email, { email, defaultRole: 'admin', userRoles: [], ...roles }).firestore();
const seed = (collection, id, data) => env.withSecurityRulesDisabled(context => context.firestore().collection(collection).doc(id).set(data));
beforeAll(async () => { env = await initializeTestEnvironment({ projectId: 'test-project-account-security', firestore: { host: 'localhost', port: 8080, rules: fs.readFileSync(path.join(__dirname, '../../firebase/firestore.rules'),'utf8') } }); });
beforeEach(async () => { await env.clearFirestore(); await seedRuleAccounts(env); });
afterAll(async () => env.cleanup());
test.each([admin, student])('private calendar credentials and revocations cannot be read or written by %s', async email => {
    await seed('calendarFeedSecrets', admin, { token: 'private-test-key', authVersion: '' });
    const db = asUser(email);
    await global.assertFails(db.collection('calendarFeedSecrets').doc(admin).get());
    await global.assertFails(db.collection('calendarFeedSecrets').get());
    await global.assertFails(db.collection('calendarFeedSecrets').doc(email).set({ token: 'forged' }));
    await global.assertFails(db.collection('revokedAccounts').doc(email).set({ revokedAt: new Date() }));
});
test('a missing profile cannot be created as admin by its student owner', async () => {
    const email = 'missing@student.kings.edu.au';
    await global.assertFails(asUser(email, { defaultRole: 'student' }).collection('users').doc(email).set({ defaultRole: 'admin', userRoles: ['admin'] }));
});
test('an old admin claim cannot keep administrator access after a live demotion', async () => {
    await seed('users', admin, { email: admin, defaultRole: 'student', userRoles: [] });
    await global.assertFails(asUser(admin).collection('canvasSyncState').doc('current').get());
    await global.assertFails(asUser(admin).collection('subjects').doc('injected').set({ name: 'Injected' }));
});
test.each(['missing', 'disabled', 'revoked', 'version-changed'])('%s accounts lose direct Firestore access despite an old valid token', async state => {
    if (state === 'missing') await env.withSecurityRulesDisabled(context => context.firestore().collection('users').doc(admin).delete());
    if (state === 'disabled') await seed('users', admin, { email: admin, defaultRole: 'admin', disabled: true });
    if (state === 'revoked') await seed('revokedAccounts', admin, { revokedAt: new Date() });
    if (state === 'version-changed') await seed('users', admin, { email: admin, defaultRole: 'admin', authVersion: 'new' });
    await global.assertFails(asUser(admin).collection('users').get());
    await global.assertFails(asUser(admin).collection('subjects').doc('injected').set({ name: 'Injected' }));
});
test('fresh account versions and live secondary roles retain legitimate permissions', async () => {
    await seed('users', admin, { email: admin, defaultRole: 'tutor', userRoles: ['admin'], authVersion: 'new' });
    await global.assertSucceeds(asUser(admin, { defaultRole: 'student', authVersion: 'new' }).collection('subjects').doc('valid').set({ name: 'Valid' }));
});


test('an unrelated Firebase identity cannot borrow an existing account by email', async () => {
    const db = env.authenticatedContext('unrelated-firebase-uid', { email: admin }).firestore();
    await global.assertFails(db.collection('users').get());
    await global.assertFails(db.collection('subjects').doc('injected').set({ name: 'Injected' }));
});
test('the signed profile ID must belong to the authenticated email', async () => {
    const db = asUser(student, { profileId: admin });
    await global.assertFails(db.collection('users').get());
    await global.assertFails(db.collection('subjects').doc('injected').set({ name: 'Injected' }));
});
