/** @jest-environment node */
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const config = require('../../vercel.json');

// Vercel disables require(esm) by default, even on Node 22. Exercise the actual
// dependencies in a fresh process with the deployment's explicit runtime flag.
test('Vercel runtime loads Firebase Auth and sanitizes HTML with the patched dependencies', () => {
    const script = `
        const assert = require('node:assert/strict');
        const crypto = require('node:crypto');
        assert.equal(typeof require('firebase-admin/auth').getAuth, 'function');
        const sanitize = require('sanitize-html');
        assert.equal(sanitize('<p>Allowed</p><script>alert(1)</script>'), '<p>Allowed</p>');
        assert.equal(sanitize('<a href="javascript:alert(1)">Link</a>'), '<a>Link</a>');
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
        const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'fixture', alg: 'RS256', use: 'sig' };
        const client = require('jwks-rsa')({ jwksUri: 'https://fixture.invalid/jwks', cache: false, fetcher: async () => ({ keys: [jwk] }) });
        client.getSigningKey('fixture').then(key => {
            const data = Buffer.from('runtime-verification');
            const signature = crypto.sign('RSA-SHA256', data, privateKey);
            assert.equal(crypto.verify('RSA-SHA256', data, key.getPublicKey(), signature), true);
            assert.equal(crypto.verify('RSA-SHA256', Buffer.from('changed'), key.getPublicKey(), signature), false);
        }).catch(error => { console.error(error); process.exitCode = 1; });
    `;
    const flags = (config.env?.NODE_OPTIONS || '').split(/\s+/).filter(Boolean);
    const result = spawnSync(process.execPath, ['--no-experimental-require-module', ...flags, '-e', script], {
        cwd: path.join(__dirname, '../..'), encoding: 'utf8', timeout: 10000,
        env: { ...process.env, NODE_OPTIONS: '' },
    });
    expect({ status: result.status, error: result.error?.message, stderr: result.stderr }).toEqual({ status: 0, error: undefined, stderr: '' });
});
