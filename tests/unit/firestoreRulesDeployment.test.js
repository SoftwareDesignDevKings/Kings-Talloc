const { deployFirestoreRules } = require('../../scripts/deployFirestoreRules.cjs');

const project = 'projects/kings-talloc-1f638';
const source = "rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { allow read: if false; } }\n";
const rules = content => ({ source: { files: [{ name: 'firestore.rules', content }] } });
const response = (value, status = 200) => ({ ok: status === 200, status, json: async () => value });
function fakeApi({ unchanged = false, createStatus = 200, patchStatus = 200, verificationMismatch = false } = {}) {
    let published = false;
    return jest.fn(async (url, options) => {
        const resource = url.replace('https://firebaserules.googleapis.com/v1/', '');
        if (resource === `${project}/releases/cloud.firestore`) {
            if (options.method === 'PATCH') {
                if (patchStatus === 200) published = true;
                return response({}, patchStatus);
            }
            return response({ rulesetName: `${project}/rulesets/${published && !verificationMismatch ? 'new' : 'old'}` });
        }
        if (resource === `${project}/rulesets/old`) return response(rules(unchanged ? source : 'old rules'));
        if (resource === `${project}/rulesets/new`) return response(rules(source));
        if (resource === `${project}/rulesets` && options.method === 'POST') {
            return response({ name: `${project}/rulesets/new` }, createStatus);
        }
        throw new Error(`Unexpected request: ${resource}`);
    });
}
const deploy = fetchImpl => deployFirestoreRules({ token: 'test-token', source, fetchImpl });

test('validates, publishes, and reads back the exact default-database rules', async () => {
    const api = fakeApi();
    await expect(deploy(api)).resolves.toEqual({ changed: true, rulesetName: `${project}/rulesets/new` });
    const create = api.mock.calls.find(([, options]) => options.method === 'POST');
    expect(JSON.parse(create[1].body)).toEqual(rules(source));
    const patch = api.mock.calls.find(([, options]) => options.method === 'PATCH');
    expect(JSON.parse(patch[1].body)).toEqual({
        release: { name: `${project}/releases/cloud.firestore`, rulesetName: `${project}/rulesets/new` },
        updateMask: 'ruleset_name',
    });
    expect(api.mock.calls.every(([url, options]) => url.startsWith(`https://firebaserules.googleapis.com/v1/${project}/`) &&
        options.redirect === 'error')).toBe(true);
});

test('unchanged rules are verified without creating another ruleset', async () => {
    const api = fakeApi({ unchanged: true });
    await expect(deploy(api)).resolves.toMatchObject({ changed: false });
    expect(api.mock.calls.every(([, options]) => options.method === 'GET')).toBe(true);
});

test('a validation failure never updates the live release', async () => {
    const api = fakeApi({ createStatus: 400 });
    await expect(deploy(api)).rejects.toThrow('POST failed (HTTP 400)');
    expect(api.mock.calls.some(([, options]) => options.method === 'PATCH')).toBe(false);
});

test('a rejected publish fails the job', async () => {
    await expect(deploy(fakeApi({ patchStatus: 403 }))).rejects.toThrow('PATCH failed (HTTP 403)');
});

test('a release that does not match the deployed rules fails verification', async () => {
    await expect(deploy(fakeApi({ verificationMismatch: true }))).rejects.toThrow('verification failed');
});

test('missing credentials and an empty source fail before making requests', async () => {
    const api = jest.fn();
    await expect(deployFirestoreRules({ token: '', source, fetchImpl: api })).rejects.toThrow('Missing FIREBASE_RULES_ACCESS_TOKEN');
    await expect(deployFirestoreRules({ token: 'test-token', source: ' ', fetchImpl: api })).rejects.toThrow('empty rules file');
    expect(api).not.toHaveBeenCalled();
});

test('unexpected server resource names cannot redirect credentials to another project', async () => {
    const api = jest.fn(async () => response({ rulesetName: 'projects/other-project/rulesets/old' }));
    await expect(deploy(api)).rejects.toThrow('Unexpected Firebase Rules resource');
    expect(api).toHaveBeenCalledTimes(1);
});
