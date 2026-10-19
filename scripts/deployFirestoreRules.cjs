const { appendFileSync } = require('node:fs');
const { loadRulesRelease } = require('./selectFirestoreRules.cjs');

const PROJECT = 'kings-talloc-1f638';
const RELEASE = `projects/${PROJECT}/releases/cloud.firestore`;
const RULESETS = `projects/${PROJECT}/rulesets`;

// Use the Rules API directly so the identity needs no access to student data,
// database configuration, indexes, billing, or other Firebase products.
async function deployFirestoreRules({ token, source, allowedPreviousSources, fetchImpl = fetch }) {
    if (!token) throw new Error('Missing FIREBASE_RULES_ACCESS_TOKEN. Configure the GitHub OIDC connection.');
    if (!source.trim()) throw new Error('Refusing to publish an empty rules file.');

    async function request(resource, method = 'GET', body) {
        if (resource !== RELEASE && resource !== RULESETS &&
            !new RegExp(`^${RULESETS}/[a-zA-Z0-9-]+$`).test(resource)) {
            throw new Error('Unexpected Firebase Rules resource.');
        }
        const response = await fetchImpl(`https://firebaserules.googleapis.com/v1/${resource}`, {
            method,
            redirect: 'error',
            signal: AbortSignal.timeout(30000),
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
        // Never log request headers, credentials, or raw error responses.
        if (!response.ok) throw new Error(`Firebase Rules ${method} failed (HTTP ${response.status}).`);
        return response.json();
    }

    const normalize = value => value.replace(/\r\n/g, '\n').trimEnd();
    const matches = ruleset => ruleset.source?.files?.length === 1 &&
        normalize(ruleset.source.files[0].content ?? '') === normalize(source);
    const matchesPrevious = (ruleset, previous) => ruleset.source?.files?.length === 1 &&
        normalize(ruleset.source.files[0].content ?? '') === normalize(previous);
    const active = await request(RELEASE);
    const existing = await request(active.rulesetName);
    if (matches(existing)) {
        return { changed: false, rulesetName: active.rulesetName };
    }

    if (allowedPreviousSources && !allowedPreviousSources.some(previous => matchesPrevious(existing, previous))) {
        throw new Error('Compatibility rules require the exact legacy rules. Strict or modified production rules were not changed.');
    }

    // Creating a ruleset validates it before the live release can change.
    const created = await request(RULESETS, 'POST', {
        source: { files: [{ name: 'firestore.rules', content: source }] },
    });
    if (!new RegExp(`^${RULESETS}/[a-zA-Z0-9-]+$`).test(created.name ?? '')) {
        throw new Error('Firebase returned an unexpected ruleset name.');
    }
    await request(RELEASE, 'PATCH', {
        release: { name: RELEASE, rulesetName: created.name },
        updateMask: 'ruleset_name',
    });
    const published = await request(RELEASE);
    if (published.rulesetName !== created.name || !matches(await request(published.rulesetName))) {
        throw new Error('Published rules verification failed. Inspect the production release before retrying.');
    }
    return { changed: true, rulesetName: published.rulesetName };
}

if (require.main === module) {
    deployFirestoreRules({
        token: process.env.FIREBASE_RULES_ACCESS_TOKEN,
        ...loadRulesRelease(process.env.FIRESTORE_RULES_STAGE || 'strict'),
    }).then(result => {
        const message = result.changed ? 'Published and verified production Firestore rules.' :
            'Verified production Firestore rules already match this commit.';
        console.log(message);
        if (process.env.GITHUB_STEP_SUMMARY) {
            appendFileSync(process.env.GITHUB_STEP_SUMMARY,
                `${message}\n\nProject: ${PROJECT}\n\nRuleset: ${result.rulesetName}\n`);
        }
    }).catch(error => {
        console.error(error.message);
        process.exitCode = 1;
    });
}

module.exports = { deployFirestoreRules };
