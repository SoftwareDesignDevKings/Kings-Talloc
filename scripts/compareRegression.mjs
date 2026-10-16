import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

// All data writes go to short-lived local emulators. Never reuse an existing app
// or Auth emulator: Firebase's client Auth emulator uses its default project.
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(join(root, 'package.json'));
const [baseline, ...testArgs] = process.argv.slice(2);
if (!baseline) throw new Error('Usage: npm run test:regression-comparison -- <production commit> [Playwright options]');
const run = (command, args, options = {}) => {
    const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', ...options });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${command} exited ${result.status}`);
    return result;
};
const git = (...args) => run('git', args, { stdio: 'pipe', encoding: 'utf8' }).stdout.trim();
const refs = { prod: git('rev-parse', '--verify', `${baseline}^{commit}`), pr: git('rev-parse', 'HEAD') };
const workspace = mkdtempSync(join(tmpdir(), 'talloc-regression-'));
const output = join(root, 'test-results', `comparison-${Date.now()}`);
mkdirSync(output, { recursive: true });
const manifest = { apps: {}, refs, output, ports: { prod: 3120, pr: 3121 }, projects: { prod: 'demo-talloc-compare-prod', pr: 'demo-talloc-compare-pr' }, authHosts: { prod: '127.0.0.1:9399', pr: '127.0.0.1:9499' }, firestoreHosts: { prod: '127.0.0.1:8380', pr: '127.0.0.1:8380' } };
const environment = {
    ...process.env, FIREBASE_SERVICE_ACCOUNT_KEY: '',
    AZURE_AD_CLIENT_ID: 'local-test', AZURE_AD_CLIENT_SECRET: 'local-test', AZURE_AD_TENANT_ID: 'local-test',
    UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '',
};

for (const variant of ['prod', 'pr']) {
    const app = join(workspace, variant); mkdirSync(app); manifest.apps[variant] = app;
    const archive = join(workspace, `${variant}.tar`);
    run('git', ['archive', '--format=tar', `--output=${archive}`, refs[variant]]);
    run('tar', ['-xf', archive, '-C', app]);
    // Older development clients hard-code shared ports; change only their local
    // emulator wiring, preserving the baseline's application and authorization logic.
    if (variant === 'prod') {
        const clientPath = join(app, 'src/firestore/firestoreClient.js');
        let client = readFileSync(clientPath, 'utf8');
        client = client.replace("'http://127.0.0.1:9099'", "`http://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'}`")
            .replace("connectFirestoreEmulator(db, '127.0.0.1', 8080);", "const [host, port] = (process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':'); connectFirestoreEmulator(db, host, Number(port));");
        writeFileSync(clientPath, client);
        const adminPath = join(app, 'src/firestore/firestoreAdmin.js');
        writeFileSync(adminPath, readFileSync(adminPath, 'utf8')
            .replace("process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';", "process.env.FIRESTORE_EMULATOR_HOST = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';")
            .replace("process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';", "process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';"));
    }
    writeFileSync(join(app, '.env.local'), 'NEXT_PUBLIC_FIREBASE_API_KEY=demo-comparison-key\nNEXTAUTH_SECRET=isolated-regression-comparison-only\n');
    writeFileSync(join(app, 'public/version.json'), JSON.stringify({ version: variant, commitHash: refs[variant], buildTime: new Date().toISOString() }));
    // Separate real installations prevent cross-checkout Next.js module resolution
    // and cache errors. Do not symlink another running app's dependencies.
    run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: app, env: environment });
}
const manifestPath = join(output, 'manifest.json'); writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
const quote = value => `'${value.replace(/'/g, "'\\''")}'`;
let failed = false;
for (const variant of ['prod', 'pr']) {
    const hub = variant === 'prod' ? 9390 : 9490;
    const emulatorConfig = join(workspace, `${variant}.firebase.json`);
    writeFileSync(emulatorConfig, JSON.stringify({ firestore: { rules: join(manifest.apps[variant], 'firebase/firestore.rules') }, emulators: { singleProjectMode: true, firestore: { host: '127.0.0.1', port: 8380 }, auth: { host: '127.0.0.1', port: variant === 'prod' ? 9399 : 9499 }, hub: { host: '127.0.0.1', port: hub }, logging: { host: '127.0.0.1', port: hub + 1 }, ui: { enabled: false } } }));
    const command = [process.execPath, require.resolve('@playwright/test/cli'), 'test', '--config=playwright.regression.config.cjs', ...testArgs].map(quote).join(' ');
    try {
        run(process.execPath, [require.resolve('firebase-tools/lib/bin/firebase.js'), 'emulators:exec', '--only', 'firestore,auth', '--project', manifest.projects[variant], '--config', emulatorConfig, command], { env: { ...environment, COMPARISON_MANIFEST: manifestPath, COMPARISON_VARIANT: variant } });
    } catch (error) { failed = true; console.error(`${variant}: ${error.message}`); }
}
console.log(`Comparison evidence: ${output}\nApp copies retained for diagnosis: ${workspace}`);
if (failed) process.exitCode = 1;
